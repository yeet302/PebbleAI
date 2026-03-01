"use client";

import { useState, useEffect } from "react";
import { ScheduleState, Message, CalendarEvent } from "@/types";
import Calendar from "@/components/Calendar";
import GoalList from "@/components/GoalList";
import Chat from "@/components/Chat";
import Landing from "@/components/Landing";
import WeeklyReview from "@/components/WeeklyReview";

const SCHEDULE_KEY = "pebble-schedule";
const MESSAGES_KEY = "pebble-messages";
const STARTED_KEY = "pebble-started";
const INITIAL_STATE: ScheduleState = { events: [], goals: [] };

export default function HomePage() {
  const [schedule, setSchedule] = useState<ScheduleState>(INITIAL_STATE);
  const [messages, setMessages] = useState<Message[]>([]);
  const [started, setStarted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showReview, setShowReview] = useState(false);
  const [highlightedEventIds, setHighlightedEventIds] = useState<string[]>([]);

  useEffect(() => {
    const s = localStorage.getItem(SCHEDULE_KEY);
    if (s) setSchedule(JSON.parse(s));
    const m = localStorage.getItem(MESSAGES_KEY);
    if (m) setMessages(JSON.parse(m));
    if (localStorage.getItem(STARTED_KEY)) setStarted(true);
  }, []);

  useEffect(() => {
    localStorage.setItem(SCHEDULE_KEY, JSON.stringify(schedule));
  }, [schedule]);

  useEffect(() => {
    localStorage.setItem(MESSAGES_KEY, JSON.stringify(messages));
  }, [messages]);

  const begin = (importedEvents: CalendarEvent[] = []) => {
    const next: ScheduleState = { events: importedEvents, goals: [] };
    setSchedule(next);
    setStarted(true);
    localStorage.setItem(STARTED_KEY, "1");

    const greeting: Message = {
      role: "assistant",
      content: importedEvents.length
        ? `I've loaded ${importedEvents.length} events from your calendar. What goal or hobby do you want to make time for?`
        : "What goal or hobby do you want to make time for?",
    };
    setMessages([greeting]);
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
        body: JSON.stringify({ messages: nextMessages, currentState: schedule }),
      });
      if (!res.ok) throw new Error("Failed to reach AI");
      const data: { message: string; schedule: ScheduleState; changedEventIds: string[] } = await res.json();

      setMessages((prev) => [...prev, { role: "assistant", content: data.message }]);
      setSchedule(data.schedule);
      if (data.changedEventIds?.length) setHighlightedEventIds(data.changedEventIds);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setSchedule(INITIAL_STATE);
    setMessages([]);
    setStarted(false);
    localStorage.removeItem(SCHEDULE_KEY);
    localStorage.removeItem(MESSAGES_KEY);
    localStorage.removeItem(STARTED_KEY);
  };

  return (
    <div className="h-screen overflow-hidden flex flex-col">
      {!started && <Landing onImport={(events) => begin(events)} onSkip={() => begin()} />}
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
          <button
            onClick={() => setShowReview(true)}
            className="text-xs text-gray-500 border border-gray-200 rounded-lg px-3 py-1.5 hover:border-blue-300 hover:text-blue-600 transition-colors"
          >
            Review Week
          </button>
          <button onClick={handleClear} className="text-xs text-gray-400 hover:text-red-500">Reset</button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar — Goals */}
        <aside className="w-56 border-r bg-white flex flex-col flex-shrink-0">
          <div className="px-4 py-3 border-b">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Goals</p>
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            <GoalList goals={schedule.goals} events={schedule.events} />
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
          />
        </main>

        {/* Chat panel */}
        <aside className="w-80 border-l bg-white flex flex-col flex-shrink-0">
          <div className="px-4 py-3 border-b flex-shrink-0">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Assistant</p>
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
