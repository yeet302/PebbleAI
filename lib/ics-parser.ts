import { CalendarEvent, EventCategory } from "@/types";

// BYDAY abbreviation → JS getDay() value (0=Sun)
const BYDAY_MAP: Record<string, number> = {
  SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6,
};

function unfold(ics: string): string {
  return ics.replace(/\r\n[ \t]/g, "").replace(/\r\n/g, "\n");
}

function parseDateTime(val: string): { date: string; time: string; js: Date } | null {
  const clean = val.replace(/^TZID=[^:]+:/, "");
  const dateOnly = clean.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (dateOnly) {
    const js = new Date(+dateOnly[1], +dateOnly[2] - 1, +dateOnly[3]);
    return { date: `${dateOnly[1]}-${dateOnly[2]}-${dateOnly[3]}`, time: "00:00", js };
  }
  const dt = clean.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})/);
  if (dt) {
    const js = new Date(+dt[1], +dt[2] - 1, +dt[3], +dt[4], +dt[5]);
    return { date: `${dt[1]}-${dt[2]}-${dt[3]}`, time: `${dt[4]}:${dt[5]}`, js };
  }
  return null;
}

function toISO(d: Date): string {
  return d.toISOString().split("T")[0];
}

function guessCategory(title: string): EventCategory {
  const t = title.toLowerCase();
  if (/class|lecture|seminar|course|lab/.test(t)) return "class";
  if (/study|homework|assignment|exam|quiz|review/.test(t)) return "study";
  if (/gym|workout|run|yoga|lift|crossfit|swim/.test(t)) return "gym";
  if (/work|meeting|standup|interview|shift/.test(t)) return "work";
  return "personal";
}

function parseRRule(rrule: string): Record<string, string> {
  return Object.fromEntries(rrule.split(";").map((p) => p.split("=")));
}

function expandRRule(base: CalendarEvent, rrule: string, dtstart: Date): CalendarEvent[] {
  const rule = parseRRule(rrule);
  const freq = rule.FREQ;
  const interval = parseInt(rule.INTERVAL ?? "1");
  const count = rule.COUNT ? parseInt(rule.COUNT) : null;

  // Parse UNTIL date
  let until: Date | null = null;
  if (rule.UNTIL) {
    const u = rule.UNTIL.replace(/[TZ]/g, "");
    until = new Date(+u.slice(0, 4), +u.slice(4, 6) - 1, +u.slice(6, 8));
  }

  // Cap expansion at 6 months from today if no end condition
  const cap = new Date();
  cap.setMonth(cap.getMonth() + 6);
  const endDate = until && until < cap ? until : cap;

  // Parse BYDAY days
  const byDay = rule.BYDAY
    ? rule.BYDAY.split(",").map((d) => BYDAY_MAP[d.replace(/[-+\d]/g, "")]).filter((d) => d !== undefined)
    : null;

  const makeOccurrence = (date: Date): CalendarEvent => ({
    ...base,
    id: crypto.randomUUID(),
    date: toISO(date),
  });

  const events: CalendarEvent[] = [];
  let occurrences = 0;

  if (freq === "DAILY") {
    const cursor = new Date(dtstart);
    while (cursor <= endDate && (count === null || occurrences < count)) {
      events.push(makeOccurrence(cursor));
      occurrences++;
      cursor.setDate(cursor.getDate() + interval);
    }
  } else if (freq === "WEEKLY") {
    const targetDays = byDay ?? [dtstart.getDay()];
    // Start from the Sunday of the week containing dtstart
    const cursor = new Date(dtstart);
    cursor.setDate(cursor.getDate() - cursor.getDay());
    cursor.setHours(0, 0, 0, 0);

    while (cursor <= endDate && (count === null || occurrences < count)) {
      for (const dow of targetDays.sort((a, b) => a - b)) {
        const occ = new Date(cursor);
        occ.setDate(cursor.getDate() + dow);
        if (occ >= dtstart && occ <= endDate && (count === null || occurrences < count)) {
          events.push(makeOccurrence(occ));
          occurrences++;
        }
      }
      cursor.setDate(cursor.getDate() + 7 * interval);
    }
  } else if (freq === "MONTHLY") {
    const cursor = new Date(dtstart);
    while (cursor <= endDate && (count === null || occurrences < count)) {
      events.push(makeOccurrence(cursor));
      occurrences++;
      cursor.setMonth(cursor.getMonth() + interval);
    }
  }

  return events;
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
      const startRaw = props["DTSTART"] ?? "";
      const endRaw   = props["DTEND"]   ?? "";
      const start = parseDateTime(startRaw);
      const end   = parseDateTime(endRaw);

      if (start && end) {
        const base: CalendarEvent = {
          id: crypto.randomUUID(),
          title,
          date: start.date,
          startTime: start.time,
          endTime: end.time,
          category: guessCategory(title),
          source: "imported",
          description: props["DESCRIPTION"],
        };

        if (props["RRULE"]) {
          events.push(...expandRRule(base, props["RRULE"], start.js));
        } else {
          events.push(base);
        }
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
