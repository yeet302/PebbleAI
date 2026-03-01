export type EventCategory = "class" | "study" | "gym" | "work" | "goal" | "personal";
export type EventSource = "imported" | "pebble";
export type OptimizationMode = "sleep" | "productivity" | "fitness";

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

export interface SchedulingOption {
  id: OptimizationMode;
  title: string;
  points: string[];           // 2–3 goal-specific bullets
  rationale: string;          // coach message shown when user picks this option
  goalDraft?: {
    id: string;
    title: string;
    type: "short-term" | "long-term";
    deadline: string;
    description?: string;
  };
  previewEvents: CalendarEvent[];  // proposed Pebbles for this option
}

export interface ChatResponse {
  message: string;
  diff?: Partial<ScheduleDiff>;
}

export interface ScoreCategory {
  name: string;
  score: number;     // 0–100
  insight: string;   // 1–2 sentence analysis
  tip: string;       // 1-line actionable tip
}

export interface WeekScore {
  overall: number;
  summary: string;
  categories: ScoreCategory[];
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
