"use client";

import { useState, useEffect } from "react";
import { ScheduleState, Message, CalendarEvent, UserProfile, SchedulingOption, OptimizationMode, WeekScore } from "@/types";
import Calendar from "@/components/Calendar";
import GoalList from "@/components/GoalList";
import Chat from "@/components/Chat";
import Landing from "@/components/Landing";
import WeeklyReview from "@/components/WeeklyReview";
import ScoreCard from "@/components/ScoreCard";
import ScorePanel from "@/components/ScorePanel";
import SchedulePickerModal from "@/components/SchedulePickerModal";

const SCHEDULE_KEY = "pebble-schedule";
const MESSAGES_KEY = "pebble-messages";
const STARTED_KEY = "pebble-started";
const CHECKIN_KEY = "pebble-checkin-date";
const GC_ACCESS_KEY = "pebble-gc-access";
const GC_REFRESH_KEY = "pebble-gc-refresh";
const GC_EXPIRY_KEY = "pebble-gc-expiry";
const PROFILE_KEY = "pebble-profile";
const SCORE_CACHE_KEY = "pebble-score-cache";
const MODE_KEY = "pebble-mode";

function scheduleHash(schedule: ScheduleState): string {
  const today = new Date().toISOString().split("T")[0];
  const weekEnd = new Date();
  weekEnd.setDate(weekEnd.getDate() + 7);
  const weekEndStr = weekEnd.toISOString().split("T")[0];
  const ids = schedule.events
    .filter((e) => e.date >= today && e.date <= weekEndStr)
    .map((e) => e.id)
    .sort()
    .join(",");
  return `${today}:${ids}`;
}
const INITIAL_STATE: ScheduleState = { events: [], goals: [] };

export default function HomePage() {
  const [schedule, setSchedule] = useState<ScheduleState>(INITIAL_STATE);
  const [messages, setMessages] = useState<Message[]>([]);
  const [started, setStarted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showReview, setShowReview] = useState(false);
  const [showScore, setShowScore] = useState(false);
  const [weekScore, setWeekScore] = useState<WeekScore | null>(null);
  const [scoreLoading, setScoreLoading] = useState(false);
  const [scoreCacheHash, setScoreCacheHash] = useState<string>("");
  const [highlightedEventIds, setHighlightedEventIds] = useState<string[]>([]);
  const [gcConnected, setGcConnected] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [optimizationMode, setOptimizationMode] = useState<OptimizationMode>("fitness");
  const [showReschedule, setShowReschedule] = useState(false);
  const [rescheduleOptions, setRescheduleOptions] = useState<SchedulingOption[] | null>(null);
  const [rescheduleLoading, setRescheduleLoading] = useState(false);

  useEffect(() => {
    // 1. Check URL params for post-OAuth redirect tokens
    const url = new URL(window.location.href);
    const gcAccessParam = url.searchParams.get("gc_access");
    const gcRefreshParam = url.searchParams.get("gc_refresh");
    const gcExpiryParam = url.searchParams.get("gc_expiry");

    if (gcAccessParam) {
      localStorage.setItem(GC_ACCESS_KEY, gcAccessParam);
      if (gcRefreshParam) localStorage.setItem(GC_REFRESH_KEY, gcRefreshParam);
      if (gcExpiryParam) localStorage.setItem(GC_EXPIRY_KEY, gcExpiryParam);
      // Clean URL
      url.searchParams.delete("gc_access");
      url.searchParams.delete("gc_refresh");
      url.searchParams.delete("gc_expiry");
      window.history.replaceState({}, "", url.toString());
    }

    const s = localStorage.getItem(SCHEDULE_KEY);
    const loadedSchedule: ScheduleState = s ? JSON.parse(s) : INITIAL_STATE;
    setSchedule(loadedSchedule);
    const m = localStorage.getItem(MESSAGES_KEY);
    if (m) setMessages(JSON.parse(m));
    if (localStorage.getItem(STARTED_KEY)) setStarted(true);

    // Load profile
    const storedProfile = localStorage.getItem(PROFILE_KEY);
    if (storedProfile) setProfile(JSON.parse(storedProfile));

    // Load optimization mode
    const storedMode = localStorage.getItem(MODE_KEY) as OptimizationMode | null;
    if (storedMode) setOptimizationMode(storedMode);

    // Load cached score (only if hash still matches)
    const cachedScore = localStorage.getItem(SCORE_CACHE_KEY);
    if (cachedScore) {
      const { hash, score } = JSON.parse(cachedScore);
      if (hash === scheduleHash(loadedSchedule)) {
        setWeekScore(score);
        setScoreCacheHash(hash);
      }
    }

    // 2. Google Calendar sync
    const accessToken = localStorage.getItem(GC_ACCESS_KEY);
    if (accessToken) {
      setGcConnected(true);
      const refreshToken = localStorage.getItem(GC_REFRESH_KEY) ?? "";
      const expiry = Number(localStorage.getItem(GC_EXPIRY_KEY) ?? "0");

      fetch("/api/calendar/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken, refreshToken, expiry }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.error) return;
          if (data.newAccessToken) {
            localStorage.setItem(GC_ACCESS_KEY, data.newAccessToken);
            if (data.newExpiry) localStorage.setItem(GC_EXPIRY_KEY, String(data.newExpiry));
          }
          setSchedule((prev) => {
            const pebbleEvents = prev.events.filter((e) => e.source !== "imported");
            return { ...prev, events: [...pebbleEvents, ...data.events] };
          });
          // Auto-start if returning from OAuth and not yet started
          if (gcAccessParam && !localStorage.getItem(STARTED_KEY)) {
            const loadedProfile: UserProfile | null = JSON.parse(localStorage.getItem(PROFILE_KEY) ?? "null");
            const next: ScheduleState = { events: data.events, goals: [] };
            setSchedule(next);
            setStarted(true);
            localStorage.setItem(STARTED_KEY, "1");
            const greeting = loadedProfile
              ? `Welcome back, ${loadedProfile.name}! I've loaded ${data.events.length} events from your Google Calendar. What goal do you want to work on?`
              : `I've loaded ${data.events.length} events from your Google Calendar. Before we start scheduling, I'd love to learn a bit about you... What's your name?`;
            setMessages([{ role: "assistant", content: greeting }]);
          }
        })
        .catch(() => {});
    }

    // 3. Daily check-in: once per day if there are incomplete past/today Pebbles
    const today = new Date().toISOString().split("T")[0];
    const lastCheckin = localStorage.getItem(CHECKIN_KEY);
    if (lastCheckin !== today && localStorage.getItem(STARTED_KEY)) {
      const pending = loadedSchedule.events.filter(
        (e) => e.source === "pebble" && !e.completed && e.date <= today
      );
      if (pending.length > 0) {
        const list = pending.map((e) => `• ${e.title} (${e.date})`).join("\n");
        const checkinMsg: Message = {
          role: "user",
          content: `[DAILY CHECK-IN] Today is ${today}. These Pebble sessions are scheduled but not yet marked complete:\n${list}\n\nPlease ask me which ones I completed.`,
        };
        localStorage.setItem(CHECKIN_KEY, today);
        const currentProfile: UserProfile | null = JSON.parse(localStorage.getItem(PROFILE_KEY) ?? "null");
        // Trigger after a short delay so the UI is ready
        setTimeout(() => {
          setMessages((prev) => {
            const next = [...prev, checkinMsg];
            const currentMode = (localStorage.getItem(MODE_KEY) as OptimizationMode | null) ?? "fitness";
            fetch("/api/schedule", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ messages: next, currentState: loadedSchedule, profile: currentProfile, optimizationMode: currentMode }),
            })
              .then((r) => r.json())
              .then((data) => {
                setMessages((p) => [...p, { role: "assistant", content: data.message }]);
                setSchedule(data.schedule);
              })
              .catch(() => {});
            return next;
          });
        }, 800);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(SCHEDULE_KEY, JSON.stringify(schedule));
  }, [schedule]);

  useEffect(() => {
    localStorage.setItem(MESSAGES_KEY, JSON.stringify(messages));
  }, [messages]);

  // Auto-score: debounced, cached by schedule hash
  useEffect(() => {
    if (!started) return;
    const hash = scheduleHash(schedule);
    if (hash === scoreCacheHash) return;

    setScoreLoading(true);
    const timer = setTimeout(async () => {
      try {
        const currentProfile: UserProfile | null = JSON.parse(localStorage.getItem(PROFILE_KEY) ?? "null");
        const res = await fetch("/api/score", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ schedule, profile: currentProfile }),
        });
        if (!res.ok) return;
        const score: WeekScore = await res.json();
        setWeekScore(score);
        setScoreCacheHash(hash);
        localStorage.setItem(SCORE_CACHE_KEY, JSON.stringify({ hash, score }));
      } finally {
        setScoreLoading(false);
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [schedule, started]); // eslint-disable-line react-hooks/exhaustive-deps

  const begin = (importedEvents: CalendarEvent[] = []) => {
    const next: ScheduleState = { events: importedEvents, goals: [] };
    setSchedule(next);
    setStarted(true);
    localStorage.setItem(STARTED_KEY, "1");

    const loadedProfile: UserProfile | null = JSON.parse(localStorage.getItem(PROFILE_KEY) ?? "null");

    let greeting: string;
    if (loadedProfile) {
      greeting = importedEvents.length
        ? `Welcome back, ${loadedProfile.name}! I've loaded ${importedEvents.length} events from your calendar. What goal do you want to work on?`
        : `Welcome back, ${loadedProfile.name}! What goal do you want to work on?`;
    } else {
      greeting = importedEvents.length
        ? `Hi! I'm Pebble. I've loaded ${importedEvents.length} events from your calendar. Before we start scheduling, I'd love to learn a bit about you... What's your name?`
        : "Hi! I'm Pebble. Before we start scheduling, I'd love to learn a bit about you... What's your name?";
    }

    setMessages([{ role: "assistant", content: greeting }]);
  };

  const sendMessage = async (text: string) => {
    const userMessage: Message = { role: "user", content: text };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages, currentState: schedule, profile, optimizationMode }),
      });
      if (!res.ok) throw new Error("Failed to reach AI");
      const data: { message: string; schedule: ScheduleState; changedEventIds: string[]; profile: UserProfile | null } = await res.json();

      setMessages((prev) => [...prev, { role: "assistant", content: data.message }]);
      setSchedule(data.schedule);
      if (data.changedEventIds?.length) setHighlightedEventIds(data.changedEventIds);
      if (data.profile !== null) {
        setProfile(data.profile);
        localStorage.setItem(PROFILE_KEY, JSON.stringify(data.profile));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleModeChange = (mode: OptimizationMode) => {
    setOptimizationMode(mode);
    localStorage.setItem(MODE_KEY, mode);
  };

  const handleOpenReschedule = () => {
    setRescheduleOptions([]);
    setRescheduleLoading(true);
    setShowReschedule(true);
    setError(null);

    const modes: OptimizationMode[] = ["sleep", "productivity", "fitness"];
    let completed = 0;

    modes.forEach((mode) => {
      fetch("/api/reschedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schedule, profile, mode }),
      })
        .then((r) => r.json())
        .then((option: SchedulingOption) => {
          setRescheduleOptions((prev) => [...(prev ?? []), option]);
        })
        .catch(() => setError("Failed to generate one or more options"))
        .finally(() => {
          completed++;
          if (completed === modes.length) setRescheduleLoading(false);
        });
    });
  };

  const handleApplyReschedule = (id: string) => {
    const option = rescheduleOptions?.find((o) => o.id === id);
    if (!option) return;
    setSchedule((prev) => ({
      ...prev,
      events: [
        ...prev.events.filter((e) => e.source !== "pebble"),
        ...option.previewEvents,
      ],
    }));
    setMessages((prev) => [...prev, { role: "assistant", content: option.rationale }]);
    setHighlightedEventIds(option.previewEvents.map((e) => e.id));
    setShowReschedule(false);
    setRescheduleOptions(null);
  };

  const handleClear = () => {
    setSchedule(INITIAL_STATE);
    setMessages([]);
    setStarted(false);
    setGcConnected(false);
    setProfile(null);
    setWeekScore(null);
    setScoreCacheHash("");
    setOptimizationMode("fitness");
    setShowReschedule(false);
    setRescheduleOptions(null);
    localStorage.removeItem(SCHEDULE_KEY);
    localStorage.removeItem(SCORE_CACHE_KEY);
    localStorage.removeItem(MESSAGES_KEY);
    localStorage.removeItem(STARTED_KEY);
    localStorage.removeItem(GC_ACCESS_KEY);
    localStorage.removeItem(GC_REFRESH_KEY);
    localStorage.removeItem(GC_EXPIRY_KEY);
    localStorage.removeItem(PROFILE_KEY);
    localStorage.removeItem(MODE_KEY);
  };

  const handleGcDisconnect = () => {
    setGcConnected(false);
    localStorage.removeItem(GC_ACCESS_KEY);
    localStorage.removeItem(GC_REFRESH_KEY);
    localStorage.removeItem(GC_EXPIRY_KEY);
    // Remove imported events, keep pebble events
    setSchedule((prev) => ({ ...prev, events: prev.events.filter((e) => e.source !== "imported") }));
  };

  const handleEditPreferences = async () => {
    setProfile(null);
    localStorage.removeItem(PROFILE_KEY);
    setLoading(true);
    setError(null);

    const redoMsg: Message = { role: "user", content: "[REDO PREFERENCES]" };
    const nextMessages = [...messages, redoMsg];
    setMessages(nextMessages);

    try {
      const res = await fetch("/api/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages, currentState: schedule, profile: null }),
      });
      if (!res.ok) throw new Error("Failed to reach AI");
      const data: { message: string; schedule: ScheduleState; changedEventIds: string[]; profile: UserProfile | null } = await res.json();

      setMessages((prev) => [...prev, { role: "assistant", content: data.message }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen overflow-hidden flex flex-col">
      {!started && <Landing onImport={(events) => begin(events)} onSkip={() => begin()} />}
      {showReschedule && (
        <SchedulePickerModal
          options={rescheduleOptions ?? []}
          schedule={schedule}
          loading={rescheduleLoading}
          onSelect={handleApplyReschedule}
          onClose={() => { setShowReschedule(false); setRescheduleOptions(null); setRescheduleLoading(false); }}
        />
      )}
      {showScore && (
        <ScoreCard schedule={schedule} profile={profile} onClose={() => setShowScore(false)} />
      )}
      {showReview && (
        <WeeklyReview
          events={schedule.events}
          onSubmit={(msg) => { sendMessage(msg); }}
          onClose={() => setShowReview(false)}
        />
      )}

      {/* Header */}
      <header className="border-b bg-white px-6 py-4 flex items-center justify-between shadow-sm flex-shrink-0">
        <div className="flex items-center gap-2">
          <img src="/pebble_logo.png" alt="Pebble" className="w-8 h-8 rounded-lg object-cover" />
          <h1 className="text-xl font-bold text-blue-600">Pebble</h1>
        </div>
        <div className="flex items-center gap-4">
          {gcConnected && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-2.5 py-1 flex items-center gap-1.5">
                <svg className="w-3 h-3" viewBox="0 0 24 24">
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Google Calendar
              </span>
              <button
                onClick={handleGcDisconnect}
                className="text-xs text-gray-400 hover:text-red-500 transition-colors"
              >
                Disconnect
              </button>
            </div>
          )}
          {started && profile && (
            <button
              onClick={handleEditPreferences}
              className="text-xs text-gray-500 border border-gray-200 rounded-lg px-3 py-1.5 hover:border-blue-300 hover:text-blue-600 transition-colors"
            >
              Edit Preferences
            </button>
          )}
          {started && schedule.events.some((e) => e.source === "pebble") && (
            <button
              onClick={handleOpenReschedule}
              disabled={rescheduleLoading}
              className="text-xs text-white bg-blue-600 border border-blue-600 rounded-lg px-3 py-1.5 hover:bg-blue-700 transition-colors disabled:opacity-60"
            >
              {rescheduleLoading ? "Loading…" : "Reschedule"}
            </button>
          )}
          <button
            onClick={() => setShowReview(true)}
            className="text-xs text-gray-500 border border-gray-200 rounded-lg px-3 py-1.5 hover:border-blue-300 hover:text-blue-600 transition-colors"
          >
            Review Week
          </button>
          <button onClick={handleClear} className="text-xs text-gray-500 hover:text-red-500">Reset</button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar — Goals + Week Score */}
        <aside className="w-56 border-r bg-white flex flex-col flex-shrink-0">
          <div className="px-4 py-3 border-b">
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Goals</p>
          </div>
          <div className="flex-1 overflow-y-auto">
            <div className="p-3">
              <GoalList goals={schedule.goals} events={schedule.events} />
            </div>
            {started && (scoreLoading || weekScore) && (
              <>
                <div className="px-4 py-3 border-t border-b">
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Week Score</p>
                </div>
                <div className="p-3">
                  <ScorePanel
                    score={weekScore}
                    loading={scoreLoading}
                    onViewDetails={() => setShowScore(true)}
                  />
                </div>
              </>
            )}
          </div>
        </aside>

        {/* Calendar */}
        <main className="flex-1 overflow-hidden p-4">
          <Calendar
            events={schedule.events}
            highlightedEventIds={highlightedEventIds}
            onHighlightDone={() => setHighlightedEventIds([])}
            onUpdateEvent={(updated) => setSchedule((s) => ({ ...s, events: s.events.map((e) => e.id === updated.id ? updated : e) }))}
            onDeleteEvent={(id) => setSchedule((s) => ({ ...s, events: s.events.filter((e) => e.id !== id) }))}
            optimizationMode={optimizationMode}
            onSetMode={handleModeChange}
          />
        </main>

        {/* Chat panel */}
        <aside className="w-80 border-l bg-white flex flex-col flex-shrink-0">
          <div className="px-4 py-3 border-b flex-shrink-0">
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Assistant</p>
          </div>
          {error && <p className="text-xs text-red-500 px-4 pt-2">{error}</p>}
          <div className="flex-1 overflow-hidden">
            <Chat messages={messages} onSend={sendMessage} loading={loading} />
          </div>
        </aside>
      </div>
    </div>
  );
}
