import { CalendarEvent, EventCategory } from "@/types";

interface GoogleEventDateTime {
  date?: string;       // all-day: "YYYY-MM-DD"
  dateTime?: string;   // timed: ISO 8601
}

interface GoogleEvent {
  id: string;
  summary?: string;
  description?: string;
  start: GoogleEventDateTime;
  end: GoogleEventDateTime;
}

function guessCategory(title: string): EventCategory {
  const t = title.toLowerCase();
  if (/class|lecture|seminar|course|lab/.test(t)) return "class";
  if (/study|homework|assignment|exam|quiz|review/.test(t)) return "study";
  if (/gym|workout|run|yoga|lift|crossfit|swim/.test(t)) return "gym";
  if (/work|meeting|standup|interview|shift/.test(t)) return "work";
  return "personal";
}

function extractDate(dt: GoogleEventDateTime): string {
  if (dt.date) return dt.date;
  if (dt.dateTime) return dt.dateTime.slice(0, 10);
  return new Date().toISOString().slice(0, 10);
}

function extractTime(dt: GoogleEventDateTime): string {
  if (dt.date) return "00:00";
  if (dt.dateTime) {
    const d = new Date(dt.dateTime);
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  }
  return "00:00";
}

export function mapGoogleEvent(ev: GoogleEvent): CalendarEvent {
  const title = ev.summary ?? "Event";
  return {
    id: `google-${ev.id}`,
    title,
    date: extractDate(ev.start),
    startTime: extractTime(ev.start),
    endTime: extractTime(ev.end),
    category: guessCategory(title),
    source: "imported",
    description: ev.description,
  };
}
