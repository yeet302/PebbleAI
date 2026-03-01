export type EventCategory = "class" | "study" | "gym" | "work" | "goal" | "personal";
export type EventSource = "imported" | "pebble";

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;       // YYYY-MM-DD
  startTime: string;  // HH:MM (24h)
  endTime: string;    // HH:MM (24h)
  category: EventCategory;
  source: EventSource;
  description?: string;
  recurring?: "daily" | "weekly" | "none";
  goalId?: string;    // links this session to a Goal
  completed?: boolean;
}

export interface Goal {
  id: string;
  title: string;
  type: "short-term" | "long-term";
  description?: string;
  deadline?: string;
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

export interface UserProfile {
  name: string;
  wakeTime: string;                    // "HH:MM"
  sleepTime: string;                   // "HH:MM"
  energyPeak: "morning" | "evening";
  sessionLengthMinutes: number;
  freeDays: string[];                  // e.g. ["Saturday", "Sunday"]
  notes?: string;
}

export interface ScheduleDiff {
  addEvents: CalendarEvent[];
  updateEvents: CalendarEvent[];
  removeEventIds: string[];
  addGoals: Goal[];
  updateGoals: Goal[];
  removeGoalIds: string[];
  setProfile?: UserProfile;
}
