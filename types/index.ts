export type EventCategory = "class" | "study" | "gym" | "work" | "goal" | "personal";

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

export interface Message {
  role: "user" | "assistant";
  content: string;
}

export interface ChatResponse {
  message: string;
  diff?: Partial<ScheduleDiff>;
}

export interface ScheduleDiff {
  addEvents: CalendarEvent[];
  updateEvents: CalendarEvent[];
  removeEventIds: string[];
  addGoals: Goal[];
  updateGoals: Goal[];
  removeGoalIds: string[];
}

export interface ClassEntry {
  name: string;
  days: string[];   // e.g. ["Mon", "Wed"]
  startTime: string;
  endTime: string;
}

export interface UserProfile {
  name: string;
  school: string;
  major: string;
  year: string;
  classes: ClassEntry[];
  goals: string[];  // free-text goals entered during onboarding
}
