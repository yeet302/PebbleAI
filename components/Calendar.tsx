"use client";

import { CSSProperties, useEffect, useMemo, useState } from "react";
import { CalendarEvent, EventCategory, EventCompletionStatus } from "@/types";

interface CalendarProps {
  events: CalendarEvent[];
  onTitleChange?: (title: string) => void;
  onEventCompletionChange?: (eventId: string, status: EventCompletionStatus) => void;
}

type CalendarView = "day" | "week" | "month" | "search";

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
const WEEK_ROW_MIN_PX = 28;
const WEEK_ROW_DETAIL_PX = 42;
const WEEK_ROW_MAX_PX = 64;
const WEEK_ROW_EMPTY_MIN_PX = 18;
const WEEK_TICK_OPTIONS_MINUTES = [60, 90, 120, 150, 180, 240];

const categoryColors: Record<EventCategory, string> = {
  class: "bg-blue-100 border-blue-400 text-blue-800",
  study: "bg-yellow-100 border-yellow-400 text-yellow-800",
  gym: "bg-green-100 border-green-400 text-green-800",
  work: "bg-orange-100 border-orange-400 text-orange-800",
  leisure: "bg-cyan-100 border-cyan-400 text-cyan-800",
  rest: "bg-indigo-100 border-indigo-400 text-indigo-800",
  goal: "bg-purple-100 border-purple-400 text-purple-800",
  personal: "bg-gray-100 border-gray-400 text-gray-800",
  sleep: "bg-indigo-100 border-indigo-400 text-indigo-800",
  meal: "bg-rose-100 border-rose-400 text-rose-800",
  break: "bg-teal-100 border-teal-400 text-teal-800",
};

const categorySortRank: Record<EventCategory, number> = {
  work: 10,
  class: 11,
  study: 12,
  goal: 13,
  leisure: 20,
  gym: 21,
  personal: 22,
  break: 23,
  rest: 30,
  sleep: 31,
  meal: 32,
};

function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function fromIsoDateLocal(isoDate: string): Date {
  const [year, month, day] = isoDate.split("-").map(Number);
  if (!year || !month || !day) return new Date();
  return new Date(year, month - 1, day);
}

function isSameCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatShortDate(date: Date): string {
  const mm = `${date.getMonth() + 1}`.padStart(2, "0");
  const dd = `${date.getDate()}`.padStart(2, "0");
  const yy = `${date.getFullYear()}`.slice(-2);
  return `${mm}/${dd}/${yy}`;
}

function formatLongDate(date: Date): string {
  return `${MONTH_NAMES[date.getMonth()]} ${date.getDate()} ${date.getFullYear()}`;
}

function formatDateWithWeekday(isoDate: string): string {
  const date = fromIsoDateLocal(isoDate);
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
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

function titleMatchesQuery(title: string, query: string): boolean {
  const normalizedTitle = normalizeText(title);
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) return false;
  if (normalizedTitle.startsWith(normalizedQuery) || normalizedTitle.includes(normalizedQuery)) {
    return true;
  }
  const queryTokens = normalizedQuery.split(" ").filter(Boolean);
  const titleTokens = normalizedTitle.split(" ").filter(Boolean);
  return queryTokens.every((queryToken) =>
    titleTokens.some((titleToken) => fuzzyTokenMatch(queryToken, titleToken))
  );
}

function getEventStartHour(event: CalendarEvent): number {
  const [hours] = event.startTime.split(":");
  const parsed = Number(hours);
  if (Number.isNaN(parsed)) return 0;
  return Math.max(0, Math.min(23, parsed));
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return 0;
  return Math.max(0, Math.min(24 * 60, h * 60 + m));
}

function getEventTimeRange(event: CalendarEvent): string {
  if (event.endTime === "23:59") return event.startTime;
  return `${event.startTime}-${event.endTime}`;
}

function minutesToClockLabel(totalMinutes: number): string {
  const minutesInDay = 24 * 60;
  const normalized = ((totalMinutes % minutesInDay) + minutesInDay) % minutesInDay;
  const hour = Math.floor(normalized / 60);
  const minute = normalized % 60;
  return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
}

function chooseBestWeekLayout(viewportHeight: number): { tickMinutes: number; rowHeightPx: number } {
  // Reserve space for header/top controls/paddings so the weekly grid avoids page scrolling.
  const estimatedChromePx = 320;
  const availableGridPx = Math.max(220, viewportHeight - estimatedChromePx);

  let chosenTick = WEEK_TICK_OPTIONS_MINUTES[WEEK_TICK_OPTIONS_MINUTES.length - 1];
  let chosenRowHeight = WEEK_ROW_MIN_PX;

  // Prefer the most detailed interval that still leaves enough row height for readability.
  for (const tickMinutes of WEEK_TICK_OPTIONS_MINUTES) {
    const rows = Math.ceil((24 * 60) / tickMinutes);
    const rowHeight = availableGridPx / rows;
    if (rowHeight >= WEEK_ROW_DETAIL_PX) {
      chosenTick = tickMinutes;
      chosenRowHeight = Math.min(WEEK_ROW_MAX_PX, Math.max(WEEK_ROW_MIN_PX, rowHeight));
      return { tickMinutes: chosenTick, rowHeightPx: chosenRowHeight };
    }
  }

  // Fallback: choose the densest interval that still fits minimum row height.
  let bestFill = -1;
  for (const tickMinutes of WEEK_TICK_OPTIONS_MINUTES) {
    const rows = Math.ceil((24 * 60) / tickMinutes);
    const rowHeight = availableGridPx / rows;
    if (rowHeight < WEEK_ROW_MIN_PX) continue;
    const fillRatio = rowHeight / WEEK_ROW_MAX_PX;
    if (fillRatio > bestFill) {
      bestFill = fillRatio;
      chosenTick = tickMinutes;
      chosenRowHeight = Math.min(WEEK_ROW_MAX_PX, Math.max(WEEK_ROW_MIN_PX, rowHeight));
    }
  }

  return { tickMinutes: chosenTick, rowHeightPx: chosenRowHeight };
}

function buildWeekTickHeights(
  tickStarts: number[],
  tickEventLoad: Map<number, number>,
  targetTotalHeight: number
): Map<number, number> {
  const weights = tickStarts.map((tickStart) => {
    const count = tickEventLoad.get(tickStart) ?? 0;
    if (count <= 0) return 0.55;
    return 1.25 + Math.min(1.2, count * 0.22);
  });

  const totalWeight = weights.reduce((sum, w) => sum + w, 0) || 1;
  const heights = weights.map((w) => (w / totalWeight) * targetTotalHeight);

  const minAppliedHeights = heights.map((h) => Math.max(WEEK_ROW_EMPTY_MIN_PX, h));
  const totalAfterMin = minAppliedHeights.reduce((sum, h) => sum + h, 0);
  const scale = totalAfterMin > 0 ? targetTotalHeight / totalAfterMin : 1;
  const scaled = minAppliedHeights.map((h) =>
    Math.max(WEEK_ROW_EMPTY_MIN_PX, Math.min(WEEK_ROW_MAX_PX, h * scale))
  );

  const result = new Map<number, number>();
  tickStarts.forEach((tickStart, idx) => {
    result.set(tickStart, scaled[idx]);
  });
  return result;
}

function compareEvents(a: CalendarEvent, b: CalendarEvent): number {
  return (
    a.startTime.localeCompare(b.startTime) ||
    (categorySortRank[a.category] ?? 999) - (categorySortRank[b.category] ?? 999) ||
    a.title.localeCompare(b.title)
  );
}

function extractLocation(description?: string): string | null {
  if (!description) return null;
  const explicitMatch = description.match(/(?:takes place|located)\s+at\s+(.+?)(?:[.,;]|$)/i);
  if (explicitMatch?.[1]) {
    const location = explicitMatch[1].trim();
    if (location.length > 2) return location;
  }

  const genericAtMatch = description.match(/\bat\s+([a-z][a-z0-9\s'-]{2,80})(?:[.,;]|$)/i);
  if (!genericAtMatch?.[1]) return null;
  const location = genericAtMatch[1].trim();
  return location.length > 2 ? location : null;
}

function EventLocationMap({
  location,
  className = "text-sm md:text-base",
  linkStyle,
}: {
  location: string;
  className?: string;
  linkStyle?: CSSProperties;
}) {
  const encoded = encodeURIComponent(location);
  const googleSearchLink = `https://www.google.com/maps/search/?api=1&query=${encoded}`;
  return (
    <div className={`mt-1 flex gap-2 ${className}`}>
      <a
        href={googleSearchLink}
        target="_blank"
        rel="noreferrer"
        style={linkStyle}
        className="inline-block max-w-full truncate whitespace-nowrap rounded border border-gray-300 px-2 py-1 text-gray-700 hover:bg-gray-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
      >
        Google Maps
      </a>
    </div>
  );
}

interface PositionedDayEvent {
  event: CalendarEvent;
  startMinutes: number;
  endMinutes: number;
  column: number;
  totalColumns: number;
}

function positionDayEvents(dayEvents: CalendarEvent[]): PositionedDayEvent[] {
  const sorted = [...dayEvents].sort((a, b) => a.startTime.localeCompare(b.startTime));
  type InternalEvent = {
    event: CalendarEvent;
    startMinutes: number;
    endMinutes: number;
    column: number;
    clusterId: number;
  };
  const internal: InternalEvent[] = [];
  const active: InternalEvent[] = [];
  const clusterMaxColumns = new Map<number, number>();
  let clusterId = -1;

  for (const event of sorted) {
    const startMinutes = timeToMinutes(event.startTime);
    let endMinutes = timeToMinutes(event.endTime);

    if (event.endTime === "23:59") {
      endMinutes = 24 * 60;
    } else if (endMinutes <= startMinutes) {
      endMinutes = Math.min(24 * 60, startMinutes + 60);
    }

    for (let i = active.length - 1; i >= 0; i -= 1) {
      if (active[i].endMinutes <= startMinutes) {
        active.splice(i, 1);
      }
    }

    if (active.length === 0) {
      clusterId += 1;
      clusterMaxColumns.set(clusterId, 1);
    }

    const usedColumns = new Set(active.map((item) => item.column));
    let column = 0;
    while (usedColumns.has(column)) {
      column += 1;
    }

    const current: InternalEvent = {
      event,
      startMinutes,
      endMinutes,
      column,
      clusterId,
    };
    internal.push(current);
    active.push(current);

    const currentOverlapCount = active.length;
    clusterMaxColumns.set(
      clusterId,
      Math.max(clusterMaxColumns.get(clusterId) ?? 1, currentOverlapCount)
    );
  }

  return internal.map((item) => ({
    event: item.event,
    startMinutes: item.startMinutes,
    endMinutes: item.endMinutes,
    column: item.column,
    totalColumns: clusterMaxColumns.get(item.clusterId) ?? 1,
  }));
}

function EventCard({
  event,
  compact = false,
  summaryOnly = false,
  showTime = true,
  compactVariant = "week",
  onClick,
}: {
  event: CalendarEvent;
  compact?: boolean;
  summaryOnly?: boolean;
  showTime?: boolean;
  compactVariant?: "week" | "month";
  onClick?: () => void;
}) {
  const location = extractLocation(event.description);
  const timeRange = getEventTimeRange(event);
  const compactTitlePx =
    compactVariant === "month"
      ? event.title.length > 24
        ? 10
        : event.title.length > 16
        ? 11
        : event.title.length > 10
        ? 12
        : 13
      : event.title.length > 28
      ? 11
      : event.title.length > 20
      ? 12
      : event.title.length > 12
      ? 13
      : 14;
  const compactTimePx =
    compactVariant === "month"
      ? timeRange.length > 12
        ? 9
        : 10
      : timeRange.length > 12
      ? 10
      : 11;
  const titleStyle = compact
    ? { fontSize: `${compactTitlePx}px` }
    : { fontSize: "clamp(1.05rem, 0.9vw + 0.55rem, 1.4rem)" };
  const timeStyle = compact
    ? { fontSize: `${compactTimePx}px` }
    : { fontSize: "clamp(0.95rem, 0.7vw + 0.5rem, 1.2rem)" };
  const descriptionStyle = compact
    ? { fontSize: "clamp(0.74rem, 0.35vw + 0.42rem, 0.88rem)" }
    : { fontSize: "clamp(0.9rem, 0.65vw + 0.45rem, 1.08rem)" };
  return (
    <div
      className={`min-w-0 overflow-hidden rounded border-l-2 px-2 py-1 ${categoryColors[event.category] ?? categoryColors.personal}`}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
    >
      <p className="font-bold truncate leading-tight" style={titleStyle}>{event.title}</p>
      {showTime && (
        <p className="truncate text-gray-700 dark:text-slate-400 font-semibold leading-tight" style={timeStyle}>
          {timeRange}
        </p>
      )}
      {!summaryOnly && event.description && (
        <p className="mt-1 line-clamp-2 break-words text-gray-600 dark:text-slate-300 leading-tight" style={descriptionStyle}>
          {event.description}
        </p>
      )}
      {!summaryOnly && location && (
        <EventLocationMap
          location={location}
          className={compact ? "text-xs" : "text-sm md:text-base"}
          linkStyle={{ fontSize: compact ? "11px" : undefined }}
        />
      )}
    </div>
  );
}

export default function Calendar({ events, onTitleChange, onEventCompletionChange }: CalendarProps) {
  const [view, setView] = useState<CalendarView>("week");
  const [referenceDate, setReferenceDate] = useState(new Date());
  const [searchInput, setSearchInput] = useState("");
  const [activeSearchKeyword, setActiveSearchKeyword] = useState("");
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const [weekTickMinutes, setWeekTickMinutes] = useState(120);
  const [weekRowHeightPx, setWeekRowHeightPx] = useState(32);
  const [dayZoomed, setDayZoomed] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pickedDate, setPickedDate] = useState(toIsoDate(new Date()));
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  const selectedEvent = useMemo(
    () => (selectedEventId ? events.find((event) => event.id === selectedEventId) ?? null : null),
    [events, selectedEventId]
  );

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
      map.set(date, [...list].sort(compareEvents));
    }
    return map;
  }, [filteredEvents]);

  const searchSuggestions = useMemo(() => {
    const query = normalizeText(searchInput);
    if (!query) return [];
    const deduped = new Map<string, string>();
    for (const event of events) {
      if (!titleMatchesQuery(event.title, query)) continue;
      const normalizedTitle = normalizeText(event.title);
      if (!deduped.has(normalizedTitle)) {
        deduped.set(normalizedTitle, event.title.trim());
      }
    }
    return [...deduped.values()]
      .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }))
      .slice(0, 10);
  }, [events, searchInput]);

  const searchedEventsByDate = useMemo(() => {
    const keyword = activeSearchKeyword.trim();
    const map = new Map<string, CalendarEvent[]>();
    if (!keyword) return map;
    const matching = events.filter((event) => titleMatchesQuery(event.title, keyword));
    for (const event of matching) {
      const current = map.get(event.date) ?? [];
      current.push(event);
      map.set(event.date, current);
    }
    for (const [date, list] of map.entries()) {
      map.set(date, [...list].sort(compareEvents));
    }
    return new Map([...map.entries()].sort((a, b) => a[0].localeCompare(b[0])));
  }, [events, activeSearchKeyword]);

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
      : view === "month"
      ? `${MONTH_NAMES[referenceDate.getMonth()]} ${referenceDate.getFullYear()}`
      : activeSearchKeyword
      ? `Search: ${activeSearchKeyword}`
      : "Search Results";

  const weekSummary = useMemo(() => {
    const weekDates = getWeekDates(referenceDate);
    const first = toIsoDate(weekDates[0]);
    const last = toIsoDate(weekDates[6]);
    const weekEvents = events.filter((event) => event.date >= first && event.date <= last);
    const completed = weekEvents.filter((event) => event.completionStatus === "completed").length;
    const notCompleted = weekEvents.filter((event) => event.completionStatus === "not-completed").length;
    const pending = weekEvents.length - completed - notCompleted;
    const completionRate = weekEvents.length > 0 ? Math.round((completed / weekEvents.length) * 100) : 0;
    return {
      total: weekEvents.length,
      completed,
      notCompleted,
      pending,
      completionRate,
    };
  }, [events, referenceDate]);

  const daySummary = useMemo(() => {
    const isoDate = toIsoDate(referenceDate);
    const dayEvents = events.filter((event) => event.date === isoDate);
    const completed = dayEvents.filter((event) => event.completionStatus === "completed").length;
    const notCompleted = dayEvents.filter((event) => event.completionStatus === "not-completed").length;
    const pending = dayEvents.length - completed - notCompleted;
    const completionRate = dayEvents.length > 0 ? Math.round((completed / dayEvents.length) * 100) : 0;
    return {
      total: dayEvents.length,
      completed,
      notCompleted,
      pending,
      completionRate,
    };
  }, [events, referenceDate]);

  const monthSummary = useMemo(() => {
    const year = referenceDate.getFullYear();
    const month = referenceDate.getMonth();
    const monthEvents = events.filter((event) => {
      const d = fromIsoDateLocal(event.date);
      return d.getFullYear() === year && d.getMonth() === month;
    });
    const completed = monthEvents.filter((event) => event.completionStatus === "completed").length;
    const notCompleted = monthEvents.filter((event) => event.completionStatus === "not-completed").length;
    const pending = monthEvents.length - completed - notCompleted;
    const completionRate = monthEvents.length > 0 ? Math.round((completed / monthEvents.length) * 100) : 0;
    return {
      total: monthEvents.length,
      completed,
      notCompleted,
      pending,
      completionRate,
    };
  }, [events, referenceDate]);

  useEffect(() => {
    onTitleChange?.(title);
  }, [title, onTitleChange]);

  useEffect(() => {
    if (!selectedEventId) return;
    if (!events.some((event) => event.id === selectedEventId)) {
      setSelectedEventId(null);
    }
  }, [events, selectedEventId]);

  useEffect(() => {
    const syncWeekTick = () => {
      const layout = chooseBestWeekLayout(window.innerHeight);
      setWeekTickMinutes(layout.tickMinutes);
      setWeekRowHeightPx(layout.rowHeightPx);
    };
    syncWeekTick();
    window.addEventListener("resize", syncWeekTick);
    return () => window.removeEventListener("resize", syncWeekTick);
  }, []);

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

  const today = new Date();
  const isReferenceToday = isSameCalendarDay(referenceDate, today);
  const pickDateLabel = isReferenceToday ? "Pick Date" : formatLongDate(referenceDate);

  const openDay = (date: Date) => {
    setReferenceDate(new Date(date));
    setView("day");
  };

  const goToPickedDate = () => {
    if (!pickedDate) return;
    openDay(fromIsoDateLocal(pickedDate));
    setShowDatePicker(false);
  };

  const handlePickDateButton = () => {
    if (showDatePicker) {
      goToPickedDate();
      return;
    }
    setPickedDate(toIsoDate(referenceDate));
    setShowDatePicker(true);
  };

  const handleCompletionClick = (eventId: string, status: EventCompletionStatus) => {
    onEventCompletionChange?.(eventId, status);
    setSelectedEventId(null);
  };

  const applyKeywordSearch = (keyword: string) => {
    const trimmed = keyword.trim();
    if (!trimmed) return;
    setSearchInput(trimmed);
    setActiveSearchKeyword(trimmed);
    setShowSearchSuggestions(false);
    setView("search");
  };

  const renderDayView = () => {
    const isoDate = toIsoDate(referenceDate);
    const dayEvents = eventsByDate.get(isoDate) ?? [];
    const hourLabels = Array.from({ length: 25 }, (_, h) => h);
    const pixelsPerMinute = 0.8;
    const topPadding = 14;
    const bottomPadding = 14;
    const fitHeight = 560;
    const zoomHeight = 24 * 60 * pixelsPerMinute + topPadding + bottomPadding;
    const timelineHeight = dayZoomed ? zoomHeight : fitHeight;
    const effectivePixelsPerMinute = (timelineHeight - topPadding - bottomPadding) / (24 * 60);
    const positionedEvents = positionDayEvents(dayEvents);

    return (
      <div className="rounded-lg border bg-white p-4 dark:bg-slate-900 dark:border-slate-700">
        <div className="mb-3 rounded-lg border border-gray-200 bg-white p-2 text-xs text-gray-700 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200">
          <span className="font-semibold">Daily Summary:</span>{" "}
          {daySummary.completed} completed, {daySummary.notCompleted} not completed, {daySummary.pending} pending
          {" "}({daySummary.completionRate}% completion, {daySummary.total} total)
        </div>
        {dayEvents.length === 0 && <p className="mb-3 text-sm text-gray-400 dark:text-slate-400">No events for this day.</p>}
        <div className="mb-2 flex justify-end">
          <button
            onClick={() => setDayZoomed((z) => !z)}
            className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {dayZoomed ? "Zoom Out" : "Zoom In"}
          </button>
        </div>
        <div
          className="relative mx-auto max-w-2xl overflow-hidden rounded-lg border border-gray-200 dark:border-slate-700"
          style={{ height: `${timelineHeight}px` }}
          onClick={() => setDayZoomed((z) => !z)}
        >
          <div
            className="absolute left-16 w-px bg-gray-300 dark:bg-slate-600"
            style={{ top: `${topPadding}px`, bottom: `${bottomPadding}px` }}
          />

          {hourLabels.map((hour) => {
            const lineTop = topPadding + hour * 60 * effectivePixelsPerMinute;
            return (
              <div key={`hour-${hour}`} className="absolute left-0 right-0" style={{ top: `${lineTop}px` }}>
                <div className="absolute left-2 text-[11px] text-gray-400 dark:text-slate-500" style={{ top: "-8px" }}>
                  {`${hour.toString().padStart(2, "0")}:00`}
                </div>
                <div className="w-full border-t border-gray-100 dark:border-slate-800" />
              </div>
            );
          })}

          {positionedEvents.map(({ event, startMinutes, endMinutes, column, totalColumns }) => {
            const top = topPadding + startMinutes * effectivePixelsPerMinute;
            const minEventHeight = dayZoomed ? 24 : 14;
            const height = Math.max(minEventHeight, (endMinutes - startMinutes) * effectivePixelsPerMinute);
            const location = extractLocation(event.description);
            const widthScale = totalColumns >= 3 ? 0.7 : totalColumns === 2 ? 0.82 : 1;
            const titleSizePx = Math.max(12, Math.min(24, (12 + height * 0.06) * widthScale));
            const timeSizePx = Math.max(11, Math.min(20, (11 + height * 0.045) * widthScale));
            const descriptionSizePx = Math.max(10, Math.min(18, (10 + height * 0.03) * widthScale));
            const mapLinkSizePx = Math.max(10, Math.min(14, (10 + height * 0.02) * widthScale));
            const percentPerColumn = 100 / Math.max(1, totalColumns);
            const leftPercent = column * percentPerColumn;
            const rightPercent = 100 - (column + 1) * percentPerColumn;
            const innerGutterPx = 0;
            const cardColorClass = categoryColors[event.category] ?? categoryColors.personal;
            return (
              <div
                key={event.id}
                className={`absolute min-w-0 overflow-hidden rounded-lg border-l-4 p-2 shadow-sm ${cardColorClass}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedEventId(event.id);
                }}
                style={{
                  top: `${top}px`,
                  left: `calc(84px + ((100% - 96px) * ${leftPercent / 100}) + ${innerGutterPx}px)`,
                  right: `calc(12px + ((100% - 96px) * ${rightPercent / 100}) + ${innerGutterPx}px)`,
                  minWidth: "0px",
                  height: `${height}px`,
                  zIndex: 30,
                }}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <p className="min-w-0 flex-1 font-bold truncate leading-tight" style={{ fontSize: `${titleSizePx}px` }}>
                    {event.title}
                  </p>
                  <p
                    className="shrink-0 font-semibold text-gray-700 dark:text-slate-300 leading-tight"
                    style={{ fontSize: `${timeSizePx}px` }}
                  >
                    {getEventTimeRange(event)}
                  </p>
                </div>
                {event.description && (
                  <p
                    className="mt-1 text-gray-600 dark:text-slate-300 line-clamp-2 break-words leading-tight"
                    style={{ fontSize: `${descriptionSizePx}px` }}
                  >
                    {event.description}
                  </p>
                )}
                {location && (
                  <EventLocationMap
                    location={location}
                    className="w-full"
                    linkStyle={{ fontSize: `${mapLinkSizePx}px` }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderSearchView = () => {
    if (!activeSearchKeyword) {
      return (
        <div className="rounded-lg border bg-white p-4 text-sm text-gray-500 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-300">
          Start typing in Search and choose a keyword to see matching schedule days.
        </div>
      );
    }

    const grouped = [...searchedEventsByDate.entries()];
    if (grouped.length === 0) {
      return (
        <div className="rounded-lg border bg-white p-4 text-sm text-gray-500 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-300">
          No schedule entries found for "{activeSearchKeyword}".
        </div>
      );
    }

    return (
      <div className="rounded-lg border bg-white p-4 dark:bg-slate-900 dark:border-slate-700">
        <p className="mb-3 text-sm text-gray-600 dark:text-slate-300">
          Showing days with "<span className="font-semibold">{activeSearchKeyword}</span>"
        </p>
        <div className="space-y-3">
          {grouped.map(([isoDate, list]) => {
            const localDate = fromIsoDateLocal(isoDate);
            return (
              <div key={isoDate} className="rounded border border-gray-200 p-3 dark:border-slate-700">
                <button
                  onClick={() => openDay(localDate)}
                  className="mb-2 text-left text-sm font-semibold text-blue-700 hover:underline dark:text-blue-300"
                  title="Open this day in Day view"
                >
                  {formatLongDate(localDate)}
                </button>
                <div className="space-y-2">
                  {list.map((event) => (
                    <div
                      key={event.id}
                      className="rounded border-l-2 border-blue-400 bg-blue-50 px-2 py-1 text-sm text-gray-800 dark:bg-slate-800 dark:text-slate-100"
                      onClick={() => setSelectedEventId(event.id)}
                    >
                      <p className="font-semibold">{event.title}</p>
                      <p className="text-xs text-gray-600 dark:text-slate-300">{getEventTimeRange(event)}</p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderWeekView = () => {
    const weekDates = getWeekDates(referenceDate);
    const tickStarts = Array.from(
      { length: Math.ceil((24 * 60) / weekTickMinutes) },
      (_, i) => i * weekTickMinutes
    );
    const eventsByDayTick = new Map<string, Map<number, CalendarEvent[]>>();
    const tickEventLoad = new Map<number, number>();

    for (const date of weekDates) {
      const isoDate = toIsoDate(date);
      const dayEvents = eventsByDate.get(isoDate) ?? [];
      const eventsByTick = new Map<number, CalendarEvent[]>();
      for (const event of dayEvents) {
        const startMinutes = timeToMinutes(event.startTime);
        const tick = Math.floor(startMinutes / weekTickMinutes) * weekTickMinutes;
        const list = eventsByTick.get(tick) ?? [];
        list.push(event);
        eventsByTick.set(tick, list);
        tickEventLoad.set(tick, (tickEventLoad.get(tick) ?? 0) + 1);
      }
      eventsByDayTick.set(isoDate, eventsByTick);
    }

    const targetTotalHeight = tickStarts.length * weekRowHeightPx;
    const tickHeights = buildWeekTickHeights(tickStarts, tickEventLoad, targetTotalHeight);

    return (
      <div className="space-y-2">
        <div className="rounded-lg border border-gray-200 bg-white p-2 text-xs text-gray-700 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200">
          <span className="font-semibold">Weekly Summary:</span>{" "}
          {weekSummary.completed} completed, {weekSummary.notCompleted} not completed, {weekSummary.pending} pending
          {" "}({weekSummary.completionRate}% completion, {weekSummary.total} total)
        </div>
        <div className="grid grid-cols-8 gap-2 text-sm">
          <div className="text-center font-semibold text-gray-500 pb-1 dark:text-slate-300">Time</div>
          {DAY_NAMES.map((name, i) => (
            <div key={`${name}-${i}`} className="text-center font-semibold text-gray-600 pb-1 dark:text-slate-200">
              <div className="text-base">{name}</div>
              <button
                onClick={() => openDay(weekDates[i])}
                className="text-sm text-gray-500 font-medium hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-300"
                title="Open day view"
              >
                {`${weekDates[i].getMonth() + 1}/${weekDates[i].getDate()}`}
              </button>
            </div>
          ))}
          <div className="rounded-lg border border-gray-200 bg-white overflow-hidden dark:bg-slate-900 dark:border-slate-700">
            {tickStarts.map((tickStart) => (
              <div
                key={`time-${tickStart}`}
                className="border-t border-gray-100 px-1 py-1 dark:border-slate-800"
                style={{ minHeight: `${tickHeights.get(tickStart) ?? weekRowHeightPx}px` }}
              >
                <span className="text-[11px] font-medium text-gray-500 dark:text-slate-400">
                  {minutesToClockLabel(tickStart)}
                </span>
              </div>
            ))}
          </div>
          {weekDates.map((date) => {
            const isoDate = toIsoDate(date);
            const eventsByTick = eventsByDayTick.get(isoDate) ?? new Map<number, CalendarEvent[]>();
            return (
              <div
                key={isoDate}
                onClick={() => openDay(date)}
                className="rounded-lg border border-gray-200 bg-white overflow-hidden cursor-pointer hover:border-blue-300 dark:bg-slate-900 dark:border-slate-700 dark:hover:border-blue-500"
                title="Open day view"
              >
                {tickStarts.map((tickStart) => {
                  const slotEvents = eventsByTick.get(tickStart) ?? [];
                  return (
                    <div
                      key={`${isoDate}-${tickStart}`}
                      className="border-t border-gray-100 p-1 dark:border-slate-800"
                      style={{ minHeight: `${tickHeights.get(tickStart) ?? weekRowHeightPx}px` }}
                    >
                      {slotEvents.map((event) => (
                        <EventCard
                          key={event.id}
                          event={event}
                          compact
                          summaryOnly
                          showTime={(tickHeights.get(tickStart) ?? weekRowHeightPx) >= WEEK_ROW_DETAIL_PX}
                          compactVariant="week"
                          onClick={() => setSelectedEventId(event.id)}
                        />
                      ))}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderMonthView = () => {
    const monthGrid = getMonthGrid(referenceDate);
    const activeMonth = referenceDate.getMonth();
    return (
      <div className="space-y-2">
        <div className="rounded-lg border border-gray-200 bg-white p-2 text-xs text-gray-700 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200">
          <span className="font-semibold">Monthly Summary:</span>{" "}
          {monthSummary.completed} completed, {monthSummary.notCompleted} not completed, {monthSummary.pending} pending
          {" "}({monthSummary.completionRate}% completion, {monthSummary.total} total)
        </div>
        <div className="grid grid-cols-7 gap-2 text-sm">
          {DAY_NAMES.map((name) => (
            <div key={name} className="text-center font-semibold text-gray-600 pb-1 dark:text-slate-200">
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
                <p
                  className={`text-right text-sm font-medium ${
                    inCurrentMonth ? "text-gray-700 dark:text-slate-200" : "text-gray-400 dark:text-slate-500"
                  }`}
                >
                  {date.getDate()}
                </p>
                {dayEvents.slice(0, 5).map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    compact
                    summaryOnly
                    showTime={dayEvents.length <= 1}
                    compactVariant="month"
                    onClick={() => setSelectedEventId(event.id)}
                  />
                ))}
                {dayEvents.length > 5 && (
                  <p className="text-[11px] text-gray-500 dark:text-slate-400">+{dayEvents.length - 5} more</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-3">
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
          {view === "search" && (
            <button
              onClick={() => setView("search")}
              className="px-3 py-1 text-sm rounded bg-blue-600 text-white"
            >
              Search
            </button>
          )}
        </div>

        <button onClick={goPrevious} className="rounded border bg-white px-3 py-1 text-sm text-gray-600 hover:bg-gray-50 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
          Prev
        </button>
        <button onClick={goNext} className="rounded border bg-white px-3 py-1 text-sm text-gray-600 hover:bg-gray-50 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
          Next
        </button>
        <button
          onClick={() => setReferenceDate(new Date())}
          className={`rounded border px-3 py-1 text-sm ${
            isReferenceToday
              ? "bg-blue-600 border-blue-600 text-white"
              : "bg-white text-blue-600 hover:bg-blue-50 dark:bg-slate-900 dark:border-slate-700 dark:text-blue-300 dark:hover:bg-blue-950"
          }`}
        >
          Today
        </button>

        <div className="relative">
          <button
            onClick={handlePickDateButton}
            className={`rounded border px-3 py-1 text-sm ${
              isReferenceToday
                ? "bg-white text-gray-700 hover:bg-gray-50 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                : "bg-blue-600 border-blue-600 text-white"
            }`}
          >
            {pickDateLabel}
          </button>
          {showDatePicker && (
            <div className="absolute z-20 mt-2 w-56 rounded-lg border border-gray-200 bg-white p-2 shadow-lg dark:bg-slate-900 dark:border-slate-700">
              <input
                type="date"
                value={pickedDate}
                onChange={(e) => setPickedDate(e.target.value)}
                className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-sm text-gray-800 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100"
              />
              <button
                onClick={goToPickedDate}
                className="mt-2 w-full rounded bg-blue-600 px-2 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
              >
                Go!
              </button>
            </div>
          )}
        </div>

        <div className="relative w-72">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              setShowSearchSuggestions(true);
            }}
            onFocus={() => setShowSearchSuggestions(true)}
            onBlur={() => {
              setTimeout(() => setShowSearchSuggestions(false), 120);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                applyKeywordSearch(searchSuggestions[0] ?? searchInput);
              }
            }}
            placeholder="Search"
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100 dark:placeholder:text-slate-400"
          />
          {showSearchSuggestions && searchInput.trim().length > 0 && searchSuggestions.length > 0 && (
            <div className="absolute z-30 mt-1 w-full rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-900">
              {searchSuggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => applyKeywordSearch(suggestion)}
                  className="block w-full px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {view === "day" && renderDayView()}
      {view === "week" && renderWeekView()}
      {view === "month" && renderMonthView()}
      {view === "search" && renderSearchView()}

      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-lg rounded-xl border border-gray-200 bg-white p-4 shadow-xl dark:bg-slate-900 dark:border-slate-700">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">{selectedEvent.title}</h3>
                <p className="text-sm text-gray-600 dark:text-slate-300">
                  {formatDateWithWeekday(selectedEvent.date)} • {getEventTimeRange(selectedEvent)}
                </p>
              </div>
              <button
                onClick={() => setSelectedEventId(null)}
                className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Close
              </button>
            </div>

            <div className="mt-3 space-y-2 text-sm">
              <p><span className="font-medium">Category:</span> {selectedEvent.category}</p>
              {selectedEvent.description && (
                <p className="text-gray-700 dark:text-slate-300">{selectedEvent.description}</p>
              )}
            </div>

            <div className="mt-4">
              <p className="mb-2 text-sm font-medium text-gray-700 dark:text-slate-200">Completion Status</p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleCompletionClick(selectedEvent.id, "completed")}
                  className={`rounded px-3 py-1.5 text-sm ${
                    (selectedEvent.completionStatus ?? "pending") === "completed"
                      ? "bg-green-600 text-white"
                      : "border border-green-300 text-green-700 hover:bg-green-50 dark:border-green-700 dark:text-green-300 dark:hover:bg-green-950"
                  }`}
                >
                  Completed
                </button>
                <button
                  onClick={() => handleCompletionClick(selectedEvent.id, "not-completed")}
                  className={`rounded px-3 py-1.5 text-sm ${
                    selectedEvent.completionStatus === "not-completed"
                      ? "bg-red-600 text-white"
                      : "border border-red-300 text-red-700 hover:bg-red-50 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-950"
                  }`}
                >
                  Didn&apos;t Complete
                </button>
                <button
                  onClick={() => handleCompletionClick(selectedEvent.id, "pending")}
                  className={`rounded px-3 py-1.5 text-sm ${
                    (selectedEvent.completionStatus ?? "pending") === "pending"
                      ? "bg-gray-700 text-white dark:bg-slate-500"
                      : "border border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
                  }`}
                >
                  Pending
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
