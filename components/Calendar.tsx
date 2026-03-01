"use client";

import { useState, useEffect } from "react";
import { CalendarEvent, OptimizationMode } from "@/types";
import EventPopover from "@/components/EventPopover";

interface CalendarProps {
  events: CalendarEvent[];
  previewEvents?: CalendarEvent[];
  highlightedEventIds?: string[];
  onHighlightDone?: () => void;
  onUpdateEvent?: (event: CalendarEvent) => void;
  onDeleteEvent?: (id: string) => void;
  optimizationMode?: OptimizationMode;
  onSetMode?: (mode: OptimizationMode) => void;
}

type View = "week" | "month" | "year";

// ── constants ────────────────────────────────────────────────────────────────
const HOUR_HEIGHT = 64;
const START_HOUR = 6;
const END_HOUR = 23;
const TOTAL_HOURS = END_HOUR - START_HOUR;
const HOURS = Array.from({ length: TOTAL_HOURS }, (_, i) => START_HOUR + i);
const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const categoryColors: Record<string, string> = {
  class:    "bg-blue-600 text-white border-blue-700",
  study:    "bg-amber-500 text-white border-amber-600",
  gym:      "bg-emerald-500 text-white border-emerald-600",
  work:     "bg-orange-500 text-white border-orange-600",
  goal:     "bg-violet-600 text-white border-violet-700",
  personal: "bg-slate-500 text-white border-slate-600",
};

// Imported events use muted/outlined style
const importedColors: Record<string, string> = {
  class:    "bg-blue-100 text-blue-800 border-blue-400",
  study:    "bg-amber-100 text-amber-800 border-amber-400",
  gym:      "bg-emerald-100 text-emerald-800 border-emerald-400",
  work:     "bg-orange-100 text-orange-800 border-orange-400",
  goal:     "bg-violet-100 text-violet-800 border-violet-400",
  personal: "bg-slate-100 text-slate-700 border-slate-400",
};

const categoryDotColors: Record<string, string> = {
  class: "bg-blue-600", study: "bg-amber-500", gym: "bg-emerald-500",
  work: "bg-orange-500", goal: "bg-violet-600", personal: "bg-slate-500",
};

// ── helpers ──────────────────────────────────────────────────────────────────
function toISO(d: Date) { return d.toISOString().split("T")[0]; }

function getWeekDays(base: Date): string[] {
  const monday = new Date(base);
  monday.setDate(base.getDate() - ((base.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return toISO(d);
  });
}

function getMonthGrid(year: number, month: number): (string | null)[] {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startPad = (first.getDay() + 6) % 7; // Mon=0
  const cells: (string | null)[] = Array(startPad).fill(null);
  for (let d = 1; d <= last.getDate(); d++) {
    cells.push(toISO(new Date(year, month, d)));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function timeToMinutes(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function getEventStyle(startTime: string, endTime: string) {
  const startMin = Math.max(timeToMinutes(startTime), START_HOUR * 60);
  const endMin = Math.min(timeToMinutes(endTime), END_HOUR * 60);
  const top = ((startMin - START_HOUR * 60) / 60) * HOUR_HEIGHT;
  const height = Math.max(((endMin - startMin) / 60) * HOUR_HEIGHT, 20);
  return { top, height };
}

function layoutEvents(events: CalendarEvent[]) {
  const sorted = [...events].sort((a, b) => a.startTime.localeCompare(b.startTime));

  const overlaps = (a: CalendarEvent, b: CalendarEvent) =>
    a.startTime < b.endTime && b.startTime < a.endTime;

  // Assign each event to the first available column slot
  const slots: CalendarEvent[][] = [];
  const eventSlot = new Map<string, number>();

  for (const event of sorted) {
    let placed = false;
    for (let i = 0; i < slots.length; i++) {
      if (slots[i][slots[i].length - 1].endTime <= event.startTime) {
        slots[i].push(event);
        eventSlot.set(event.id, i);
        placed = true;
        break;
      }
    }
    if (!placed) {
      eventSlot.set(event.id, slots.length);
      slots.push([event]);
    }
  }

  return sorted.map((event) => {
    // Only count columns that have an event overlapping THIS event's time span
    const activeSlots = slots.filter((slot) => slot.some((e) => overlaps(e, event))).length;
    return {
      event,
      slotIndex: eventSlot.get(event.id)!,
      totalSlots: activeSlots || 1,
    };
  });
}

// ── sub-views ────────────────────────────────────────────────────────────────
function WeekView({ days, events, previewEvents, today, highlights, onEventClick }: { days: string[]; events: CalendarEvent[]; previewEvents: CalendarEvent[]; today: string; highlights: Set<string>; onEventClick: (e: CalendarEvent) => void }) {
  const previewIds = new Set(previewEvents.map((e) => e.id));

  return (
    <div className="flex flex-col flex-1 overflow-hidden border border-gray-200 rounded-xl">
      {/* Day headers */}
      <div className="flex flex-shrink-0 border-b border-gray-200 bg-white">
        <div className="w-14 flex-shrink-0" />
        {DAY_NAMES.map((name, i) => {
          const isToday = days[i] === today;
          return (
            <div key={name} className="flex-1 text-center py-3 text-xs font-semibold text-gray-600 border-l border-gray-200">
              <div>{name}</div>
              <div className={`text-base font-bold mt-0.5 w-8 h-8 flex items-center justify-center rounded-full mx-auto
                ${isToday ? "bg-blue-500 text-white" : "text-gray-800"}`}>
                {days[i].slice(8)}
              </div>
            </div>
          );
        })}
      </div>
      {/* Scrollable grid */}
      <div className="flex flex-1 overflow-y-auto">
        <div className="w-14 flex-shrink-0 relative bg-white" style={{ height: TOTAL_HOURS * HOUR_HEIGHT }}>
          {HOURS.map((h) => (
            <div key={h} className="absolute right-2 text-xs text-gray-500" style={{ top: (h - START_HOUR) * HOUR_HEIGHT - 8 }}>
              {h === 12 ? "12pm" : h > 12 ? `${h - 12}pm` : `${h}am`}
            </div>
          ))}
        </div>
        <div className="flex flex-1">
          {days.map((date) => {
            const dayEvents = [
              ...events.filter((e) => e.date === date),
              ...previewEvents.filter((e) => e.date === date),
            ];
            const laid = layoutEvents(dayEvents);
            return (
              <div key={date} className="flex-1 border-l border-gray-100 relative" style={{ height: TOTAL_HOURS * HOUR_HEIGHT }}>
                {HOURS.map((h) => (
                  <div key={h} className="absolute w-full border-t border-gray-100" style={{ top: (h - START_HOUR) * HOUR_HEIGHT }} />
                ))}
                {HOURS.map((h) => (
                  <div key={`${h}h`} className="absolute w-full border-t border-gray-50" style={{ top: (h - START_HOUR) * HOUR_HEIGHT + HOUR_HEIGHT / 2 }} />
                ))}
                {laid.map(({ event, slotIndex, totalSlots }) => {
                  const { top, height } = getEventStyle(event.startTime, event.endTime);
                  const isPreview = previewIds.has(event.id);
                  const palette = isPreview ? importedColors : (event.source === "imported" ? importedColors : categoryColors);
                  const colors = palette[event.category] ?? palette.personal;
                  return (
                    <div
                      key={event.id}
                      onClick={isPreview ? undefined : () => onEventClick(event)}
                      className={`absolute rounded-lg px-2 py-1 text-xs overflow-hidden shadow-sm transition-shadow ${colors} ${isPreview ? "border-2 border-dashed opacity-75 cursor-default" : "border-l-4 cursor-pointer"} ${!isPreview && highlights.has(event.id) ? "ring-2 ring-white ring-offset-1 animate-pulse shadow-lg" : ""}`}
                      style={{
                        top, height,
                        left: `calc(${(slotIndex / totalSlots) * 100}% + 4px)`,
                        right: `calc(${((totalSlots - slotIndex - 1) / totalSlots) * 100}% + 4px)`,
                      }}
                      title={`${event.title}\n${event.startTime}–${event.endTime}`}
                    >
                      <div className="flex items-center gap-1">
                        {event.completed && <span className="opacity-80">✓</span>}
                        <p className={`font-semibold truncate leading-tight ${event.completed ? "line-through opacity-60" : ""}`}>{event.title}</p>
                      </div>
                      {height >= 32 && <p className="opacity-80 truncate">{event.startTime}–{event.endTime}</p>}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function MonthView({ year, month, events, today, onDayClick }: {
  year: number; month: number; events: CalendarEvent[]; today: string;
  onDayClick: (date: string) => void;
}) {
  const grid = getMonthGrid(year, month);
  const eventsByDate: Record<string, CalendarEvent[]> = {};
  for (const e of events) {
    if (!eventsByDate[e.date]) eventsByDate[e.date] = [];
    eventsByDate[e.date].push(e);
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden border border-gray-200 rounded-xl">
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-gray-200 bg-white flex-shrink-0">
        {DAY_NAMES.map((d) => (
          <div key={d} className="text-center py-2 text-xs font-semibold text-gray-600">{d}</div>
        ))}
      </div>
      {/* Grid */}
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-7 divide-x divide-y divide-gray-100 h-full" style={{ gridAutoRows: "minmax(80px, 1fr)" }}>
          {grid.map((date, i) => {
            const dayEvents = date ? (eventsByDate[date] ?? []) : [];
            const isToday = date === today;
            return (
              <div
                key={i}
                onClick={() => date && onDayClick(date)}
                className={`p-1.5 cursor-pointer hover:bg-gray-50 transition-colors ${!date ? "bg-gray-50" : ""}`}
              >
                {date && (
                  <>
                    <div className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full mb-1
                      ${isToday ? "bg-blue-500 text-white" : "text-gray-800"}`}>
                      {date.slice(8)}
                    </div>
                    <div className="space-y-0.5">
                      {dayEvents.slice(0, 3).map((e) => (
                        <div key={e.id}
                          className={`text-xs truncate rounded px-1 ${(e.source === "imported" ? importedColors : categoryColors)[e.category] ?? categoryColors.personal}`}
                          title={`${e.title} ${e.startTime}–${e.endTime}`}>
                          {e.title}
                        </div>
                      ))}
                      {dayEvents.length > 3 && (
                        <div className="text-xs text-gray-500 pl-1">+{dayEvents.length - 3} more</div>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function YearView({ year, events, onMonthClick }: {
  year: number; events: CalendarEvent[]; onMonthClick: (month: number) => void;
}) {
  const today = toISO(new Date());
  const eventDates = new Set(events.map((e) => e.date));

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="grid grid-cols-4 gap-4 p-2">
        {Array.from({ length: 12 }, (_, month) => {
          const grid = getMonthGrid(year, month);
          return (
            <div
              key={month}
              onClick={() => onMonthClick(month)}
              className="border border-gray-200 rounded-xl p-3 cursor-pointer hover:border-blue-300 hover:shadow-sm transition-all"
            >
              <p className="text-xs font-semibold text-gray-700 mb-2">{MONTH_NAMES[month]}</p>
              <div className="grid grid-cols-7 gap-px">
                {DAY_NAMES.map((d) => (
                  <div key={d} className="text-center text-gray-500 font-medium" style={{ fontSize: 8 }}>{d[0]}</div>
                ))}
                {grid.map((date, i) => {
                  const hasEvent = date ? eventDates.has(date) : false;
                  const isToday = date === today;
                  return (
                    <div key={i} className="flex items-center justify-center" style={{ height: 14 }}>
                      {date && (
                        <div className={`rounded-full flex items-center justify-center
                          ${isToday ? "bg-blue-500 text-white" : hasEvent ? "bg-blue-100" : ""}
                        `} style={{ width: 14, height: 14, fontSize: 8 }}>
                          {hasEvent && !isToday && (
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 block" />
                          )}
                          {isToday && <span style={{ fontSize: 7 }}>{date.slice(8)}</span>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const MODE_TABS: { id: OptimizationMode; label: string; icon: string; active: string }[] = [
  { id: "sleep",        icon: "🌙", label: "Sleep",        active: "bg-indigo-600 text-white" },
  { id: "productivity", icon: "⚡", label: "Productivity", active: "bg-amber-500 text-white"  },
  { id: "fitness",      icon: "💪", label: "Fitness",      active: "bg-green-600 text-white"  },
];

// ── main component ───────────────────────────────────────────────────────────
export default function Calendar({ events, previewEvents = [], highlightedEventIds, onHighlightDone, onUpdateEvent, onDeleteEvent, optimizationMode, onSetMode }: CalendarProps) {
  const [view, setView] = useState<View>("week");
  const [current, setCurrent] = useState(new Date());
  const [highlights, setHighlights] = useState<Set<string>>(new Set());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const today = toISO(new Date());

  useEffect(() => {
    if (!highlightedEventIds?.length) return;

    // Navigate to the earliest changed event
    const changed = events
      .filter((e) => highlightedEventIds.includes(e.id))
      .sort((a, b) => a.date.localeCompare(b.date));

    if (changed.length) {
      setCurrent(new Date(changed[0].date + "T00:00:00"));
      setView("week");
    }

    setHighlights(new Set(highlightedEventIds));
    const timer = setTimeout(() => {
      setHighlights(new Set());
      onHighlightDone?.();
    }, 3000);
    return () => clearTimeout(timer);
  }, [highlightedEventIds]); // eslint-disable-line react-hooks/exhaustive-deps

  const weekDays = getWeekDays(current);
  const year = current.getFullYear();
  const month = current.getMonth();

  const navigate = (dir: 1 | -1) => {
    const d = new Date(current);
    if (view === "week") d.setDate(d.getDate() + dir * 7);
    else if (view === "month") d.setMonth(d.getMonth() + dir);
    else d.setFullYear(d.getFullYear() + dir);
    setCurrent(d);
  };

  const label =
    view === "week" ? `${weekDays[0].slice(5)} – ${weekDays[6].slice(5)}` :
    view === "month" ? `${MONTH_NAMES[month]} ${year}` :
    `${year}`;

  const goToDay = (date: string) => {
    setCurrent(new Date(date + "T00:00:00"));
    setView("week");
  };

  const goToMonth = (m: number) => {
    const d = new Date(current);
    d.setMonth(m);
    setCurrent(d);
    setView("month");
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-3 flex-shrink-0">
        <button onClick={() => navigate(-1)} className="rounded px-2 py-1 text-sm text-gray-700 hover:bg-gray-100">← Prev</button>
        <span className="text-sm font-semibold text-gray-800 w-36 text-center">{label}</span>
        <button onClick={() => navigate(1)} className="rounded px-2 py-1 text-sm text-gray-700 hover:bg-gray-100">Next →</button>
        <button onClick={() => { setCurrent(new Date()); }} className="rounded px-2 py-1 text-xs text-blue-600 hover:bg-blue-50">Today</button>

        {onSetMode && (
          <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs">
            {MODE_TABS.map((tab) => {
              const isActive = optimizationMode === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onSetMode(tab.id)}
                  className={`flex items-center gap-1 px-2.5 py-1.5 transition-colors ${isActive ? tab.active : "text-gray-600 hover:bg-gray-50"}`}
                  title={`${tab.label} mode`}
                >
                  <span>{tab.icon}</span>
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              );
            })}
          </div>
        )}

        <div className="ml-auto flex rounded-lg border border-gray-200 overflow-hidden text-xs">
          {(["week", "month", "year"] as View[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 py-1.5 capitalize transition-colors ${view === v ? "bg-blue-600 text-white" : "text-gray-700 hover:bg-gray-50"}`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {view === "week" && <WeekView days={weekDays} events={events} previewEvents={previewEvents} today={today} highlights={highlights} onEventClick={setSelectedEvent} />}

      {selectedEvent && (
        <EventPopover
          event={selectedEvent}
          onUpdate={(updated) => { onUpdateEvent?.(updated); setSelectedEvent(null); }}
          onDelete={(id) => { onDeleteEvent?.(id); setSelectedEvent(null); }}
          onClose={() => setSelectedEvent(null)}
        />
      )}
      {view === "month" && <MonthView year={year} month={month} events={events} today={today} onDayClick={goToDay} />}
      {view === "year" && <YearView year={year} events={events} onMonthClick={goToMonth} />}
    </div>
  );
}
