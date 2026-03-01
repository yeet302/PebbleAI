export type EventCategory =
  | "class"
  | "study"
  | "gym"
  | "work"
  | "goal"
  | "personal"
  | "sleep"
  | "meal"
  | "break";

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;       // ISO date string YYYY-MM-DD
  startTime: string;  // HH:MM (24h)
  endTime: string;    // HH:MM (24h)
  category: EventCategory;
  description?: string;
  recurring?: "daily" | "weekly" | "none";
}

export interface Goal {
  id: string;
  title: string;
  type: "short-term" | "long-term";
  description?: string;
  deadline?: string; // ISO date string
}

export interface ScheduleState {
  events: CalendarEvent[];
  goals: Goal[];
}
