"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ScheduleState } from "../types";
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
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createPrompt, setCreatePrompt] = useState("");
  const [createMessages, setCreateMessages] = useState<CreateChatMessage[]>([INITIAL_CREATE_MESSAGE]);
  const [isPromptRecording, setIsPromptRecording] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const stored = parseStoredSettings(localStorage.getItem(SETTINGS_KEY));
    setSettings(stored);
    setDraftSettings(stored);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", settings.theme === "dark");
    document.documentElement.style.fontSize = `${settings.zoomPercent}%`;
    document.body.style.fontFamily = settings.fontFamily;
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);

  const settingsSummary = useMemo(
    () => `${settings.theme} | ${settings.zoomPercent}%`,
    [settings.theme, settings.zoomPercent]
  );

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

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsPromptRecording(false);
  };

  const openCreateModal = () => {
    setShowCreateModal(true);
    setCreatePrompt("");
    setCreateMessages([INITIAL_CREATE_MESSAGE]);
  };

  const closeCreateModal = () => {
    stopRecording();
    setShowCreateModal(false);
    setCreatePrompt("");
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
        setSchedule(data.updatedSchedule);
      }
      if (!data.needsMoreInfo) {
        closeCreateModal();
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
    <div className="min-h-screen flex flex-col overflow-x-hidden bg-gray-50 text-gray-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="border-b bg-white px-6 py-4 flex items-center justify-between shadow-sm dark:bg-slate-900 dark:border-slate-800">
        <h1 className="text-xl font-bold text-blue-600">GoalkeeperAI</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-400 dark:text-slate-400">{settingsSummary}</span>
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

      <div className="flex flex-1 overflow-y-auto overflow-x-hidden">
        <aside className="w-64 border-r bg-white p-4 flex flex-col gap-4 overflow-y-auto dark:bg-slate-900 dark:border-slate-800">
          <h2 className="font-semibold text-sm text-gray-600 uppercase tracking-wide dark:text-slate-300">Goals</h2>
          <GoalList goals={schedule.goals} />
        </aside>

        <main className="flex-1 min-w-0 flex flex-col overflow-y-auto overflow-x-hidden">
          <div className="flex-1 overflow-y-auto p-6">
            {error && <p className="mb-3 text-sm text-red-500">{error}</p>}
            <Calendar events={schedule.events} />
          </div>
        </main>
      </div>

      <button
        onClick={openCreateModal}
        className="fixed bottom-6 right-6 z-40 rounded-full bg-blue-600 px-6 py-4 text-base font-semibold text-white shadow-xl hover:bg-blue-700"
      >
        Create (+)
      </button>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-5xl rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:bg-slate-900 dark:border-slate-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Create With Gemini</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
              Gemini will ask follow-up questions if details are missing.
            </p>

            <div className="mt-4 h-72 overflow-y-auto rounded-xl border border-gray-200 bg-gray-50 p-3 dark:bg-slate-800 dark:border-slate-700">
              {createMessages.map((msg, idx) => (
                <div
                  key={`${msg.role}-${idx}`}
                  className={`mb-2 flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
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
              className="mt-3 h-24 w-full resize-none rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100 dark:placeholder:text-slate-400"
            />

            <div className="mt-4 flex items-center justify-end">
              <div className="flex items-center gap-2">
                <button
                  onClick={closeCreateModal}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  onClick={togglePromptVoiceRecognition}
                  className={`inline-flex h-10 w-10 items-center justify-center rounded-lg border ${
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
    </div>
  );
}
