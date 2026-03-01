"use client";

import { useMemo, useState } from "react";
import { CalendarEvent, EventCategory } from "@/types";

interface CalendarProps {
  events: CalendarEvent[];
}

type CalendarView = "day" | "week" | "month";

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const categoryColors: Record<EventCategory, string> = {
  class: "bg-blue-100 border-blue-400 text-blue-800",
  study: "bg-yellow-100 border-yellow-400 text-yellow-800",
  gym: "bg-green-100 border-green-400 text-green-800",
  work: "bg-orange-100 border-orange-400 text-orange-800",
  goal: "bg-purple-100 border-purple-400 text-purple-800",
  personal: "bg-gray-100 border-gray-400 text-gray-800",
  sleep: "bg-indigo-100 border-indigo-400 text-indigo-800",
  meal: "bg-rose-100 border-rose-400 text-rose-800",
  break: "bg-teal-100 border-teal-400 text-teal-800",
};

function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(date: Date, amount: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + amount);
  return d;
}

function addMonths(date: Date, amount: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + amount);
  return d;
}

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const diffToMonday = (d.getDay() + 6) % 7;
  return addDays(d, -diffToMonday);
}

function getWeekDates(referenceDate: Date): Date[] {
  const monday = startOfWeek(referenceDate);
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

function getMonthGrid(referenceDate: Date): Date[] {
  const firstOfMonth = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
  const gridStart = startOfWeek(firstOfMonth);
  return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
}

function normalizeText(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9:\- ]/g, " ").replace(/\s+/g, " ").trim();
}

function isSubsequence(shortText: string, longText: string): boolean {
  if (shortText.length > longText.length) return false;
  let i = 0;
  let j = 0;
  while (i < shortText.length && j < longText.length) {
    if (shortText[i] === longText[j]) i += 1;
    j += 1;
  }
  return i === shortText.length;
}

function levenshteinDistance(a: string, b: string): number {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const matrix: number[][] = Array.from({ length: rows }, () => Array(cols).fill(0));
  for (let i = 0; i < rows; i += 1) matrix[i][0] = i;
  for (let j = 0; j < cols; j += 1) matrix[0][j] = j;
  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return matrix[rows - 1][cols - 1];
}

function fuzzyTokenMatch(queryToken: string, eventToken: string): boolean {
  if (eventToken.includes(queryToken)) return true;
  if (isSubsequence(queryToken, eventToken)) return true;
  const distance = levenshteinDistance(queryToken, eventToken);
  const threshold = queryToken.length <= 4 ? 1 : 2;
  return distance <= threshold;
}

function eventMatchesSearch(event: CalendarEvent, query: string): boolean {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) return true;
  const haystack = normalizeText(
    `${event.title} ${event.description ?? ""} ${event.category} ${event.date} ${event.startTime} ${event.endTime}`
  );
  if (haystack.includes(normalizedQuery)) return true;
  const queryTokens = normalizedQuery.split(" ").filter(Boolean);
  const eventTokens = haystack.split(" ").filter(Boolean);
  return queryTokens.every((queryToken) =>
    eventTokens.some((eventToken) => fuzzyTokenMatch(queryToken, eventToken))
  );
}

function getEventStartHour(event: CalendarEvent): number {
  const [hours] = event.startTime.split(":");
  const parsed = Number(hours);
  if (Number.isNaN(parsed)) return 0;
  return Math.max(0, Math.min(23, parsed));
}

function EventCard({ event }: { event: CalendarEvent }) {
  return (
    <div className={`rounded border-l-2 px-2 py-1 ${categoryColors[event.category] ?? categoryColors.personal}`}>
      <p className="font-medium truncate">{event.title}</p>
      <p className="text-gray-600 dark:text-slate-500">
        {event.startTime}-{event.endTime}
      </p>
    </div>
  );
}

export default function Calendar({ events }: CalendarProps) {
  const [view, setView] = useState<CalendarView>("week");
  const [referenceDate, setReferenceDate] = useState(new Date());
  const [searchInput, setSearchInput] = useState("");

  const filteredEvents = useMemo(
    () => events.filter((event) => eventMatchesSearch(event, searchInput)),
    [events, searchInput]
  );

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const event of filteredEvents) {
      const list = map.get(event.date) ?? [];
      list.push(event);
      map.set(event.date, list);
    }
    for (const [date, list] of map.entries()) {
      map.set(date, [...list].sort((a, b) => a.startTime.localeCompare(b.startTime)));
    }
    return map;
  }, [filteredEvents]);

  const title =
    view === "day"
      ? `${MONTH_NAMES[referenceDate.getMonth()]} ${referenceDate.getDate()}, ${referenceDate.getFullYear()}`
      : view === "week"
      ? (() => {
          const weekDates = getWeekDates(referenceDate);
          const start = weekDates[0];
          const end = weekDates[6];
          return `${MONTH_NAMES[start.getMonth()]} ${start.getDate()} - ${MONTH_NAMES[end.getMonth()]} ${end.getDate()}, ${end.getFullYear()}`;
        })()
      : `${MONTH_NAMES[referenceDate.getMonth()]} ${referenceDate.getFullYear()}`;

  const goPrevious = () => {
    setReferenceDate((current) =>
      view === "day" ? addDays(current, -1) : view === "week" ? addDays(current, -7) : addMonths(current, -1)
    );
  };

  const goNext = () => {
    setReferenceDate((current) =>
      view === "day" ? addDays(current, 1) : view === "week" ? addDays(current, 7) : addMonths(current, 1)
    );
  };

  const openDay = (date: Date) => {
    setReferenceDate(new Date(date));
    setView("day");
  };

  const renderDayView = () => {
    const isoDate = toIsoDate(referenceDate);
    const dayEvents = eventsByDate.get(isoDate) ?? [];
    return (
      <div className="rounded-lg border bg-white p-4 space-y-2 dark:bg-slate-900 dark:border-slate-700">
        {dayEvents.length === 0 && <p className="text-sm text-gray-400 dark:text-slate-400">No events for this day.</p>}
        {dayEvents.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
      </div>
    );
  };

  const renderWeekView = () => {
    const weekDates = getWeekDates(referenceDate);
    const hours = Array.from({ length: 16 }, (_, i) => i + 6);
    return (
      <div className="grid grid-cols-7 gap-2 text-xs">
        {DAY_NAMES.map((name, i) => (
          <div key={`${name}-${i}`} className="text-center font-semibold text-gray-500 pb-1 dark:text-slate-300">
            <div>{name}</div>
            <button
              onClick={() => openDay(weekDates[i])}
              className="text-gray-400 font-normal hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-300"
              title="Open day view"
            >
              {`${weekDates[i].getMonth() + 1}/${weekDates[i].getDate()}`}
            </button>
          </div>
        ))}
        {weekDates.map((date) => {
          const isoDate = toIsoDate(date);
          const dayEvents = eventsByDate.get(isoDate) ?? [];
          const eventsByHour = new Map<number, CalendarEvent[]>();
          for (const event of dayEvents) {
            const hour = getEventStartHour(event);
            const list = eventsByHour.get(hour) ?? [];
            list.push(event);
            eventsByHour.set(hour, list);
          }
          return (
            <div
              key={isoDate}
              onClick={() => openDay(date)}
              className="rounded-lg border border-gray-200 bg-white overflow-hidden cursor-pointer hover:border-blue-300 dark:bg-slate-900 dark:border-slate-700 dark:hover:border-blue-500"
              title="Open day view"
            >
              {hours.map((hour) => {
                const slotEvents = eventsByHour.get(hour) ?? [];
                return (
                  <div key={`${isoDate}-${hour}`} className="min-h-6 border-t border-gray-100 p-1 dark:border-slate-800">
                    {slotEvents.map((event) => (
                      <EventCard key={event.id} event={event} />
                    ))}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    );
  };

  const renderMonthView = () => {
    const monthGrid = getMonthGrid(referenceDate);
    const activeMonth = referenceDate.getMonth();
    return (
      <div className="grid grid-cols-7 gap-2 text-xs">
        {DAY_NAMES.map((name) => (
          <div key={name} className="text-center font-semibold text-gray-500 pb-1 dark:text-slate-300">
            {name}
          </div>
        ))}
        {monthGrid.map((date) => {
          const isoDate = toIsoDate(date);
          const dayEvents = eventsByDate.get(isoDate) ?? [];
          const inCurrentMonth = date.getMonth() === activeMonth;
          return (
            <div
              key={isoDate}
              onClick={() => openDay(date)}
              className={`min-h-28 rounded-lg border p-1.5 space-y-1 ${
                inCurrentMonth
                  ? "bg-white border-gray-200 dark:bg-slate-900 dark:border-slate-700"
                  : "bg-gray-50 border-gray-100 dark:bg-slate-950 dark:border-slate-800"
              } cursor-pointer hover:border-blue-300`}
              title="Open day view"
            >
              <p className={`text-right text-[11px] ${inCurrentMonth ? "text-gray-600 dark:text-slate-300" : "text-gray-300 dark:text-slate-600"}`}>
                {date.getDate()}
              </p>
              {dayEvents.slice(0, 3).map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
              {dayEvents.length > 3 && (
                <p className="text-[11px] text-gray-500 dark:text-slate-400">+{dayEvents.length - 3} more</p>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-3">
      <div className="rounded-xl border bg-white px-4 py-3 text-center dark:bg-slate-900 dark:border-slate-700">
        <span className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-slate-100">{title}</span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-lg border bg-white p-1 dark:bg-slate-900 dark:border-slate-700">
          <button
            onClick={() => setView("day")}
            className={`px-3 py-1 text-sm rounded ${view === "day" ? "bg-blue-600 text-white" : "text-gray-600 dark:text-slate-300"}`}
          >
            Day
          </button>
          <button
            onClick={() => setView("week")}
            className={`px-3 py-1 text-sm rounded ${view === "week" ? "bg-blue-600 text-white" : "text-gray-600 dark:text-slate-300"}`}
          >
            Week
          </button>
          <button
            onClick={() => setView("month")}
            className={`px-3 py-1 text-sm rounded ${view === "month" ? "bg-blue-600 text-white" : "text-gray-600 dark:text-slate-300"}`}
          >
            Month
          </button>
        </div>

        <button onClick={goPrevious} className="rounded border bg-white px-3 py-1 text-sm text-gray-600 hover:bg-gray-50 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
          Prev
        </button>
        <button onClick={goNext} className="rounded border bg-white px-3 py-1 text-sm text-gray-600 hover:bg-gray-50 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
          Next
        </button>
        <button
          onClick={() => setReferenceDate(new Date())}
          className="rounded border bg-white px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 dark:bg-slate-900 dark:border-slate-700 dark:text-blue-300 dark:hover:bg-blue-950"
        >
          Today
        </button>

        <div className="ml-auto min-w-72">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search"
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100 dark:placeholder:text-slate-400"
          />
        </div>
      </div>

      {view === "day" && renderDayView()}
      {view === "week" && renderWeekView()}
      {view === "month" && renderMonthView()}
    </div>
  );
}
