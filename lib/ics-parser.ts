import { CalendarEvent, EventCategory } from "@/types";

function unfold(ics: string): string {
  return ics.replace(/\r\n[ \t]/g, "").replace(/\r\n/g, "\n");
}

function parseDateTime(val: string): { date: string; time: string } | null {
  // Handle VALUE=DATE (all-day): 20240315
  const dateOnly = val.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (dateOnly) {
    return { date: `${dateOnly[1]}-${dateOnly[2]}-${dateOnly[3]}`, time: "00:00" };
  }
  // Handle DATE-TIME: 20240315T093000Z or 20240315T093000
  const dt = val.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})/);
  if (dt) {
    return { date: `${dt[1]}-${dt[2]}-${dt[3]}`, time: `${dt[4]}:${dt[5]}` };
  }
  return null;
}

function guessCategory(title: string): EventCategory {
  const t = title.toLowerCase();
  if (/class|lecture|seminar|course|lab/.test(t)) return "class";
  if (/study|homework|assignment|exam|quiz|review/.test(t)) return "study";
  if (/gym|workout|run|yoga|lift|crossfit|swim/.test(t)) return "gym";
  if (/work|meeting|standup|interview|shift/.test(t)) return "work";
  return "personal";
}

function uid(): string {
  return crypto.randomUUID();
}

export function parseICS(content: string): CalendarEvent[] {
  const lines = unfold(content).split("\n");
  const events: CalendarEvent[] = [];
  let inEvent = false;
  let props: Record<string, string> = {};

  for (const line of lines) {
    if (line.trim() === "BEGIN:VEVENT") { inEvent = true; props = {}; continue; }
    if (line.trim() === "END:VEVENT") {
      inEvent = false;
      const title = props["SUMMARY"] ?? "Event";
      const startRaw = props["DTSTART"] ?? props["DTSTART;VALUE=DATE"] ?? "";
      const endRaw   = props["DTEND"]   ?? props["DTEND;VALUE=DATE"]   ?? "";
      const start = parseDateTime(startRaw.replace(/^TZID=[^:]+:/, ""));
      const end   = parseDateTime(endRaw.replace(/^TZID=[^:]+:/, ""));
      if (start && end) {
        events.push({
          id: uid(),
          title,
          date: start.date,
          startTime: start.time,
          endTime: end.time,
          category: guessCategory(title),
          source: "imported",
          description: props["DESCRIPTION"],
        });
      }
      continue;
    }
    if (!inEvent) continue;
    const colon = line.indexOf(":");
    if (colon === -1) continue;
    const key = line.slice(0, colon).split(";")[0].toUpperCase();
    const value = line.slice(colon + 1).trim();
    props[key] = value;
  }

  return events;
}
