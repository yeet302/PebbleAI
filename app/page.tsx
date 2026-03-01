"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { EventCategory, EventCompletionStatus, ScheduleState } from "../types";
import Calendar from "../components/Calendar";
import GoalList from "../components/GoalList";

const INITIAL_STATE: ScheduleState = { events: [], goals: [] };
const SETTINGS_KEY = "goalkeeper_ui_settings";

type ThemeMode = "light" | "dark";
type CreateRole = "user" | "assistant";

interface UiSettings {
  theme: ThemeMode;
  fontFamily: string;
  zoomPercent: number;
}

interface CreateChatMessage {
  role: CreateRole;
  content: string;
}

const DEFAULT_SETTINGS: UiSettings = {
  theme: "light",
  fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif",
  zoomPercent: 100,
};

const FONT_OPTIONS: Array<{ label: string; value: string }> = [
  { label: "System Sans", value: "system-ui, -apple-system, Segoe UI, sans-serif" },
  { label: "Georgia Serif", value: "Georgia, Times New Roman, serif" },
  { label: "Trebuchet", value: "Trebuchet MS, Verdana, sans-serif" },
  { label: "Consolas Mono", value: "Consolas, Courier New, monospace" },
];

const INITIAL_CREATE_MESSAGE: CreateChatMessage = {
  role: "assistant",
  content:
    "Tell me your event details. Include event name, duration, how regular, start/end date, repeat pattern, and time. If anything is missing, I will ask follow-up questions.",
};

function pad2(value: number): string {
  return `${value}`.padStart(2, "0");
}

function toIcsDateTimeLocal(date: string, time: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  return `${y}${pad2(m)}${pad2(d)}T${pad2(hh)}${pad2(mm)}00`;
}

function escapeIcsText(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

function scheduleToIcs(schedule: ScheduleState): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//GoalkeeperAI//Schedule Export//EN",
    "CALSCALE:GREGORIAN",
  ];

  for (const event of schedule.events) {
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${event.id}@goalkeeper-ai`);
    lines.push(`DTSTAMP:${toIcsDateTimeLocal(event.date, "00:00")}`);
    lines.push(`DTSTART:${toIcsDateTimeLocal(event.date, event.startTime)}`);
    lines.push(`DTEND:${toIcsDateTimeLocal(event.date, event.endTime === "23:59" ? "23:59" : event.endTime)}`);
    lines.push(`SUMMARY:${escapeIcsText(event.title)}`);
    if (event.description) lines.push(`DESCRIPTION:${escapeIcsText(event.description)}`);
    lines.push(`CATEGORIES:${escapeIcsText(event.category)}`);
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return `${lines.join("\r\n")}\r\n`;
}

function csvEscape(value: string): string {
  if (value.includes(",") || value.includes("\"") || value.includes("\n")) {
    return `"${value.replace(/"/g, "\"\"")}"`;
  }
  return value;
}

function scheduleToCsv(schedule: ScheduleState): string {
  const header = ["id", "title", "date", "startTime", "endTime", "category", "description", "recurring", "completionStatus"];
  const rows = schedule.events.map((e) =>
    [
      e.id,
      e.title,
      e.date,
      e.startTime,
      e.endTime,
      e.category,
      e.description ?? "",
      e.recurring ?? "none",
      e.completionStatus ?? "pending",
    ].map(csvEscape).join(",")
  );
  return [header.join(","), ...rows].join("\n");
}

function downloadFile(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

const EVENT_CATEGORIES = new Set([
  "class",
  "study",
  "gym",
  "work",
  "leisure",
  "rest",
  "goal",
  "personal",
  "sleep",
  "meal",
  "break",
]);

function makeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `evt-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
}

function normalizeCompletionStatus(value: unknown): EventCompletionStatus {
  return value === "completed" || value === "not-completed" ? value : "pending";
}

function normalizeImportedSchedule(input: Partial<ScheduleState>): ScheduleState {
  const events = Array.isArray(input.events) ? input.events : [];
  const goals = Array.isArray(input.goals) ? input.goals : [];

  return {
    events: events.map((e: any) => ({
      id: e.id || makeId(),
      title: e.title || "Untitled Event",
      date: e.date || new Date().toISOString().slice(0, 10),
      startTime: e.startTime || "09:00",
      endTime: e.endTime || "10:00",
      category: EVENT_CATEGORIES.has(e.category) ? e.category : "personal",
      description: e.description || "",
      recurring: e.recurring || "none",
      completionStatus: normalizeCompletionStatus(e.completionStatus),
    })),
    goals: goals.map((g: any) => ({
      id: g.id || makeId(),
      title: g.title || "Untitled Goal",
      type: g.type === "long-term" ? "long-term" : "short-term",
      description: g.description || "",
      deadline: g.deadline || undefined,
    })),
  };
}

function parseCsvSchedule(raw: string): ScheduleState {
  const lines = raw.trim().split(/\r?\n/);
  if (lines.length < 2) return { events: [], goals: [] };
  const header = lines[0].split(",");
  const events = lines.slice(1).filter(Boolean).map((line) => {
    const cols = line.split(",");
    const row: Record<string, string> = {};
    for (let i = 0; i < header.length; i += 1) {
      row[header[i]] = (cols[i] || "").replace(/^"|"$/g, "");
    }
    const category: EventCategory = EVENT_CATEGORIES.has(row.category)
      ? (row.category as EventCategory)
      : "personal";
    return {
      id: row.id || makeId(),
      title: row.title || "Untitled Event",
      date: row.date || new Date().toISOString().slice(0, 10),
      startTime: row.startTime || "09:00",
      endTime: row.endTime || "10:00",
      category,
      description: row.description || "",
      recurring: (row.recurring as "daily" | "weekly" | "none") || "none",
      completionStatus: normalizeCompletionStatus(row.completionStatus),
    };
  });
  return { events, goals: [] };
}

function parseIcsSchedule(raw: string): ScheduleState {
  const unfolded = raw.replace(/\r?\n[ \t]/g, "");
  const blocks = unfolded.split("BEGIN:VEVENT").slice(1);
  const events = blocks.map((block) => {
    const lines = block.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

    const getPropValue = (propName: string): string => {
      const line = lines.find((l) => l.startsWith(`${propName}:`) || l.startsWith(`${propName};`));
      if (!line) return "";
      const colonIdx = line.indexOf(":");
      if (colonIdx < 0) return "";
      return line.slice(colonIdx + 1).trim();
    };

    const uid = getPropValue("UID");
    const summary = getPropValue("SUMMARY");
    const rawCategory = getPropValue("CATEGORIES");
    const description = getPropValue("DESCRIPTION");
    const dtStartRaw = getPropValue("DTSTART");
    const dtEndRaw = getPropValue("DTEND");

    const parseDt = (dt: string) => {
      if (!dt) return { date: new Date().toISOString().slice(0, 10), time: "09:00" };
      const full = dt.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?Z?$/);
      if (full) {
        return {
          date: `${full[1]}-${full[2]}-${full[3]}`,
          time: `${full[4]}:${full[5]}`,
        };
      }
      const dateOnly = dt.match(/^(\d{4})(\d{2})(\d{2})$/);
      if (dateOnly) {
        return {
          date: `${dateOnly[1]}-${dateOnly[2]}-${dateOnly[3]}`,
          time: "00:00",
        };
      }
      return { date: new Date().toISOString().slice(0, 10), time: "09:00" };
    };

    const start = parseDt(dtStartRaw);
    const end = parseDt(dtEndRaw);
    const primaryCategory = rawCategory.split(",")[0]?.trim().toLowerCase() || "";

    const safeCategory: EventCategory = EVENT_CATEGORIES.has(primaryCategory)
      ? (primaryCategory as EventCategory)
      : "personal";

    return {
      id: uid || makeId(),
      title: summary || "Untitled Event",
      date: start.date,
      startTime: start.time,
      endTime: end.time || "10:00",
      category: safeCategory,
      description: description.replace(/\\n/g, "\n").replace(/\\,/g, ",").replace(/\\;/g, ";"),
      recurring: "none" as const,
      completionStatus: "pending" as const,
    };
  });

  return { events, goals: [] };
}

function parseStoredSettings(value: string | null): UiSettings {
  if (!value) return DEFAULT_SETTINGS;
  try {
    const parsed = JSON.parse(value) as Partial<UiSettings>;
    if (!parsed.theme || !parsed.fontFamily || !parsed.zoomPercent) return DEFAULT_SETTINGS;
    return {
      theme: parsed.theme === "dark" ? "dark" : "light",
      fontFamily: parsed.fontFamily,
      zoomPercent: Math.max(80, Math.min(140, parsed.zoomPercent)),
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export default function HomePage() {
  const [schedule, setSchedule] = useState<ScheduleState>(INITIAL_STATE);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<UiSettings>(DEFAULT_SETTINGS);
  const [draftSettings, setDraftSettings] = useState<UiSettings>(DEFAULT_SETTINGS);
  const [showSettings, setShowSettings] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showGoalsSidebar, setShowGoalsSidebar] = useState(true);
  const [showAiPanel, setShowAiPanel] = useState(true);
  const [resetBackupFormat, setResetBackupFormat] = useState<"ics" | "csv" | "json">("json");
  const [resetBackupName, setResetBackupName] = useState("goalkeeper-schedule-backup");
  const [importError, setImportError] = useState<string | null>(null);
  const [calendarTitle, setCalendarTitle] = useState("");
  const [createPrompt, setCreatePrompt] = useState("");
  const [createMessages, setCreateMessages] = useState<CreateChatMessage[]>([INITIAL_CREATE_MESSAGE]);
  const [isPromptRecording, setIsPromptRecording] = useState(false);
  const recognitionRef = useRef<any>(null);
  const aiMessagesRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const stored = parseStoredSettings(localStorage.getItem(SETTINGS_KEY));
    setSettings(stored);
    setDraftSettings(stored);
  }, []);

  useEffect(() => {
    const loadScheduleFromDb = async () => {
      try {
        const res = await fetch("/api/schedule");
        if (!res.ok) return;
        const state = (await res.json()) as ScheduleState;
        setSchedule(normalizeImportedSchedule(state));
      } catch {
        // Keep client defaults if DB read fails.
      }
    };
    void loadScheduleFromDb();
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", settings.theme === "dark");
    document.documentElement.style.fontSize = `${settings.zoomPercent}%`;
    document.body.style.fontFamily = settings.fontFamily;
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);

  const settingsSummary = useMemo(
    () => `${settings.theme === "light" ? "Light" : "Dark"} | ${settings.zoomPercent}%`,
    [settings.theme, settings.zoomPercent]
  );

  useEffect(() => {
    if (aiMessagesRef.current) {
      aiMessagesRef.current.scrollTop = aiMessagesRef.current.scrollHeight;
    }
  }, [createMessages]);

  const applySettings = () => {
    setSettings(draftSettings);
  };

  const cancelSettings = () => {
    setDraftSettings(settings);
    setShowSettings(false);
  };

  const saveSettings = () => {
    setSettings(draftSettings);
    setShowSettings(false);
  };

  const exportSchedule = (format: "ics" | "csv" | "json") => {
    const stamp = new Date().toISOString().slice(0, 10);
    if (format === "ics") {
      downloadFile(`goalkeeper-schedule-${stamp}.ics`, scheduleToIcs(schedule), "text/calendar;charset=utf-8");
    } else if (format === "csv") {
      downloadFile(`goalkeeper-schedule-${stamp}.csv`, scheduleToCsv(schedule), "text/csv;charset=utf-8");
    } else {
      downloadFile(`goalkeeper-schedule-${stamp}.json`, JSON.stringify(schedule, null, 2), "application/json;charset=utf-8");
    }
    setShowExportMenu(false);
  };

  const importScheduleFile = async (file: File) => {
    setImportError(null);
    try {
      const text = await file.text();
      const ext = file.name.toLowerCase().split(".").pop();
      let parsed: ScheduleState;

      if (ext === "json") {
        parsed = normalizeImportedSchedule(JSON.parse(text) as ScheduleState);
      } else if (ext === "csv") {
        parsed = parseCsvSchedule(text);
      } else if (ext === "ics") {
        parsed = parseIcsSchedule(text);
      } else {
        throw new Error("Unsupported file type. Use .json, .csv, or .ics");
      }

      const res = await fetch("/api/schedule/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schedule: parsed }),
      });
      if (!res.ok) throw new Error("Failed to save imported schedule");

      setSchedule(normalizeImportedSchedule(parsed));
      setShowImportModal(false);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Failed to import file");
    }
  };

  const persistSchedule = async (nextSchedule: ScheduleState) => {
    const res = await fetch("/api/schedule/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ schedule: nextSchedule }),
    });
    if (!res.ok) throw new Error("Failed to persist schedule changes");
  };

  const resetDatabase = async () => {
    setImportError(null);
    try {
      const res = await fetch("/api/schedule/reset", { method: "POST" });
      if (!res.ok) throw new Error("Failed to reset database");
      setSchedule(INITIAL_STATE);
      setCreateMessages([INITIAL_CREATE_MESSAGE]);
      setCreatePrompt("");
      setShowImportModal(false);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Failed to reset database");
    }
  };

  const hasAnyData = schedule.events.length > 0 || schedule.goals.length > 0;

  const handleResetClick = () => {
    if (!hasAnyData) {
      void resetDatabase();
      return;
    }
    setResetBackupName("goalkeeper-schedule-backup");
    setResetBackupFormat("json");
    setShowResetConfirm(true);
  };

  const saveBackupAndReset = async () => {
    const stamp = new Date().toISOString().slice(0, 10);
    const baseName = resetBackupName.trim() || "goalkeeper-schedule-backup";
    const safeBaseName = baseName.replace(/[\\/:*?"<>|]/g, "-");
    const filename = `${safeBaseName}-${stamp}.${resetBackupFormat}`;
    if (resetBackupFormat === "ics") {
      downloadFile(
        filename,
        scheduleToIcs(schedule),
        "text/calendar;charset=utf-8"
      );
    } else if (resetBackupFormat === "csv") {
      downloadFile(
        filename,
        scheduleToCsv(schedule),
        "text/csv;charset=utf-8"
      );
    } else {
      downloadFile(
        filename,
        JSON.stringify(schedule, null, 2),
        "application/json;charset=utf-8"
      );
    }
    await resetDatabase();
    setShowResetConfirm(false);
  };

  const resetWithoutSaving = async () => {
    await resetDatabase();
    setShowResetConfirm(false);
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsPromptRecording(false);
  };

  const submitCreatePrompt = async () => {
    const message = createPrompt.trim();
    if (!message || loading) return;

    const nextConversation: CreateChatMessage[] = [...createMessages, { role: "user", content: message }];
    setCreateMessages(nextConversation);
    setCreatePrompt("");
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/schedule/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentState: schedule,
          conversation: nextConversation,
        }),
      });

      if (!res.ok) throw new Error("Assistant request failed");

      const data = (await res.json()) as {
        assistantMessage: string;
        needsMoreInfo: boolean;
        updatedSchedule: ScheduleState | null;
      };

      setCreateMessages((prev) => [...prev, { role: "assistant", content: data.assistantMessage }]);
      if (data.updatedSchedule) {
        setSchedule(normalizeImportedSchedule(data.updatedSchedule));
      }
      if (!data.needsMoreInfo) {
        stopRecording();
        setCreatePrompt("");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setError(msg);
      setCreateMessages((prev) => [
        ...prev,
        { role: "assistant", content: "I hit an error. Please try again with the event details." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const updateEventCompletion = (eventId: string, status: EventCompletionStatus) => {
    setSchedule((prev) => {
      const next: ScheduleState = {
        ...prev,
        events: prev.events.map((event) =>
          event.id === eventId ? { ...event, completionStatus: status } : event
        ),
      };
      void persistSchedule(next).catch((err) => {
        const msg = err instanceof Error ? err.message : "Failed to save completion status";
        setError(msg);
      });
      return next;
    });
  };

  const togglePromptVoiceRecognition = () => {
    if (isPromptRecording) {
      stopRecording();
      return;
    }

    const SpeechRecognitionCtor =
      (window as Window & { SpeechRecognition?: any; webkitSpeechRecognition?: any }).SpeechRecognition ||
      (window as Window & { SpeechRecognition?: any; webkitSpeechRecognition?: any }).webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) return;

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.maxAlternatives = 1;

    recognitionRef.current = recognition;
    setIsPromptRecording(true);

    recognition.onresult = (event: any) => {
      let finalTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        if (result.isFinal) finalTranscript += result[0].transcript;
      }
      const text = finalTranscript.trim();
      if (text) {
        setCreatePrompt((prev) => (prev ? `${prev} ${text}` : text));
      }
    };

    recognition.onerror = stopRecording;
    recognition.onend = stopRecording;
    recognition.start();
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gray-50 text-gray-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="relative border-b bg-white px-6 py-4 flex items-center justify-between shadow-sm dark:bg-slate-900 dark:border-slate-800">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-blue-600">GoalkeeperAI</h1>
        </div>
        {calendarTitle && (
          <div className="pointer-events-none absolute left-1/2 -translate-x-1/2">
            <span className="text-3xl font-extrabold tracking-tight text-gray-800 dark:text-slate-100">
              {calendarTitle}
            </span>
          </div>
        )}
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1 text-sm text-gray-400 dark:text-slate-400">
            <span>{settings.theme === "light" ? "Light" : "Dark"} |</span>
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" />
            </svg>
            <span>{settings.zoomPercent}%</span>
          </span>
          <div className="relative">
            <button
              onClick={() => setShowExportMenu((prev) => !prev)}
              className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-700"
              title="Export"
            >
              Export
            </button>
            {showExportMenu && (
              <div className="absolute right-0 z-30 mt-2 w-40 rounded-lg border border-gray-200 bg-white p-1 shadow-lg dark:bg-slate-900 dark:border-slate-700">
                <button
                  onClick={() => exportSchedule("ics")}
                  className="block w-full rounded px-2 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-50 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  .ics Calendar
                </button>
                <button
                  onClick={() => exportSchedule("csv")}
                  className="block w-full rounded px-2 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-50 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  .csv Events
                </button>
                <button
                  onClick={() => exportSchedule("json")}
                  className="block w-full rounded px-2 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-50 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  .json Backup
                </button>
              </div>
            )}
          </div>
          <button
            onClick={() => setShowImportModal(true)}
            className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-700"
            title="Import"
          >
            Import
          </button>
          <button
            onClick={handleResetClick}
            className={`inline-flex items-center justify-center rounded-lg border px-3 py-1.5 text-sm ${
              hasAnyData
                ? "border-red-300 bg-white text-red-700 hover:bg-red-50 dark:bg-slate-800 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950"
                : "border-gray-400 bg-gray-200 text-gray-600 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300"
            }`}
            title="Reset"
          >
            Reset
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-700"
            title="Options"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 15.5A3.5 3.5 0 1 0 12 8.5a3.5 3.5 0 0 0 0 7Z" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.65 1.65 0 0 0 15 19.4a1.65 1.65 0 0 0-1 .6 1.65 1.65 0 0 1-2 0 1.65 1.65 0 0 0-1-.6 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-.6-1 1.65 1.65 0 0 1 0-2 1.65 1.65 0 0 0 .6-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-.6 1.65 1.65 0 0 1 2 0 1.65 1.65 0 0 0 1 .6 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9c.26.3.46.65.6 1a1.65 1.65 0 0 1 0 2c-.14.35-.34.7-.6 1Z" />
            </svg>
          </button>
        </div>
      </header>

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {showGoalsSidebar && (
          <aside className="w-64 min-h-0 border-r bg-white p-4 flex flex-col gap-4 overflow-y-auto dark:bg-slate-900 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-sm text-gray-600 uppercase tracking-wide dark:text-slate-300">Goals</h2>
              <button
                onClick={() => setShowGoalsSidebar(false)}
                className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                title="Hide goals panel"
                aria-label="Hide goals panel"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="16" rx="2" />
                  <path d="M9 4v16" />
                  <path d="M15 9l-3 3 3 3" />
                </svg>
              </button>
            </div>
            <GoalList goals={schedule.goals} />
          </aside>
        )}
        {!showGoalsSidebar && (
          <div className="flex items-start p-2">
            <button
              onClick={() => setShowGoalsSidebar(true)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              title="Show goals panel"
              aria-label="Show goals panel"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="16" rx="2" />
                <path d="M9 4v16" />
                <path d="M12 9l3 3-3 3" />
              </svg>
            </button>
          </div>
        )}

        <main className="flex-1 min-w-0 min-h-0 flex flex-col overflow-y-auto overflow-x-hidden">
          <div className="flex-1 overflow-y-auto p-6">
            {error && <p className="mb-3 text-sm text-red-500">{error}</p>}
            <Calendar
              events={schedule.events}
              onTitleChange={setCalendarTitle}
              onEventCompletionChange={updateEventCompletion}
            />
          </div>
        </main>

        {showAiPanel && (
          <aside className="w-[320px] min-h-0 border-l bg-white p-3 flex flex-col overflow-hidden dark:bg-slate-900 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900 dark:text-slate-100">AI Prompt</h3>
              <button
                onClick={() => setShowAiPanel(false)}
                className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                title="Hide AI panel"
                aria-label="Hide AI panel"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="16" rx="2" />
                  <path d="M15 4v16" />
                  <path d="M9 9l3 3-3 3" />
                </svg>
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
              Event name, duration, how regular, start/end date, repeat, and time.
            </p>

            <div
              ref={aiMessagesRef}
              className="mt-2 flex-1 min-h-0 overflow-y-auto rounded-xl border border-gray-200 bg-gray-50 p-2 dark:bg-slate-800 dark:border-slate-700"
            >
              {createMessages.map((msg, idx) => (
                <div
                  key={`${msg.role}-${idx}`}
                  className={`mb-2 flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[90%] rounded-lg px-3 py-2 text-sm ${
                      msg.role === "user"
                        ? "bg-blue-600 text-white"
                        : "bg-white text-gray-800 border border-gray-200 dark:bg-slate-900 dark:text-slate-100 dark:border-slate-700"
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-2 shrink-0">
              <textarea
                value={createPrompt}
                onChange={(e) => setCreatePrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void submitCreatePrompt();
                  }
                }}
                placeholder="event name, duration, how regular, start/end date, repeat, time"
                className="h-20 w-full resize-none rounded-xl border border-gray-300 bg-white px-2 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100 dark:placeholder:text-slate-400"
              />

              <div className="mt-2 flex items-center justify-end gap-1.5">
                <button
                  onClick={() => {
                    stopRecording();
                    setCreatePrompt("");
                  }}
                  className="rounded-lg border border-gray-300 px-2 py-1.5 text-xs text-gray-700 hover:bg-gray-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Clear
                </button>
                <button
                  onClick={togglePromptVoiceRecognition}
                  className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border ${
                    isPromptRecording
                      ? "border-red-500 bg-red-50 text-red-600"
                      : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                  }`}
                  title={isPromptRecording ? "Stop recording" : "Start recording"}
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 1 0 6 0V6a3 3 0 0 0-3-3Z" />
                    <path d="M19 11a7 7 0 1 1-14 0" />
                    <path d="M12 18v3" />
                  </svg>
                </button>
              </div>
            </div>
          </aside>
        )}
        {!showAiPanel && (
          <div className="flex items-start p-2">
            <button
              onClick={() => setShowAiPanel(true)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              title="Show AI panel"
              aria-label="Show AI panel"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="16" rx="2" />
                <path d="M15 4v16" />
                <path d="M12 9l-3 3 3 3" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl dark:bg-slate-900 dark:border-slate-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Import Schedule</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
              Import a schedule file to replace current saved data. Supported formats: .json, .csv, .ics
            </p>

            <label className="mt-4 block rounded-xl border border-dashed border-gray-300 p-4 text-sm text-gray-600 dark:border-slate-600 dark:text-slate-300">
              Choose a file
              <input
                type="file"
                accept=".json,.csv,.ics"
                className="mt-2 block w-full text-sm"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void importScheduleFile(file);
                }}
              />
            </label>

            {importError && <p className="mt-3 text-sm text-red-500">{importError}</p>}

            <div className="mt-5 flex items-center justify-between">
              <button
                onClick={handleResetClick}
                className={`rounded-lg border px-3 py-2 text-sm ${
                  hasAnyData
                    ? "border-red-300 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950"
                    : "border-gray-400 bg-gray-200 text-gray-600 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300"
                }`}
              >
                Reset Database
              </button>
              <button
                onClick={() => {
                  setImportError(null);
                  setShowImportModal(false);
                }}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-xl border border-gray-200 bg-white p-5 shadow-xl dark:bg-slate-900 dark:border-slate-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Display Options</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">Customize theme and readability.</p>

            <div className="mt-4 space-y-4">
              <label className="block">
                <span className="text-sm font-medium text-gray-700 dark:text-slate-200">Theme</span>
                <select
                  value={draftSettings.theme}
                  onChange={(e) =>
                    setDraftSettings((prev) => ({ ...prev, theme: e.target.value === "dark" ? "dark" : "light" }))
                  }
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100"
                >
                  <option value="light">Light Mode</option>
                  <option value="dark">Dark Mode</option>
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-medium text-gray-700 dark:text-slate-200">Font Type</span>
                <select
                  value={draftSettings.fontFamily}
                  onChange={(e) => setDraftSettings((prev) => ({ ...prev, fontFamily: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100"
                >
                  {FONT_OPTIONS.map((option) => (
                    <option key={option.label} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 dark:text-slate-200">Zoom</span>
                  <span className="text-sm text-gray-500 dark:text-slate-300">{draftSettings.zoomPercent}%</span>
                </div>
                <input
                  type="range"
                  min={80}
                  max={140}
                  step={5}
                  value={draftSettings.zoomPercent}
                  onChange={(e) => setDraftSettings((prev) => ({ ...prev, zoomPercent: Number(e.target.value) }))}
                  className="mt-2 w-full"
                />
              </label>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={cancelSettings}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={applySettings}
                className="rounded-lg border border-blue-300 px-4 py-2 text-sm text-blue-700 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-300 dark:hover:bg-blue-950"
              >
                Apply
              </button>
              <button
                onClick={saveSettings}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-5 shadow-xl dark:bg-slate-900 dark:border-slate-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Reset Saved Schedule</h3>
            <p className="mt-2 text-sm text-gray-600 dark:text-slate-300">
              This will clear all saved events and goals from the database. Choose one option below.
            </p>
            <label className="mt-4 block">
              <span className="text-sm font-medium text-gray-700 dark:text-slate-200">Backup extension</span>
              <select
                value={resetBackupFormat}
                onChange={(e) =>
                  setResetBackupFormat((e.target.value as "ics" | "csv" | "json") || "json")
                }
                className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100"
              >
                <option value="ics">.ics (calendar)</option>
                <option value="csv">.csv (events table)</option>
                <option value="json">.json (full backup)</option>
              </select>
            </label>
            <label className="mt-3 block">
              <span className="text-sm font-medium text-gray-700 dark:text-slate-200">Save As</span>
              <input
                type="text"
                value={resetBackupName}
                onChange={(e) => setResetBackupName(e.target.value)}
                placeholder="goalkeeper-schedule-backup"
                className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100"
              />
            </label>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={() => void saveBackupAndReset()}
                className="rounded-lg border border-blue-300 px-3 py-2 text-sm text-blue-700 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-300 dark:hover:bg-blue-950"
              >
                Save + Reset
              </button>
              <button
                onClick={() => void resetWithoutSaving()}
                className="rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                Reset Without Saving
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
