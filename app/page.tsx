"use client";

import { useState, useEffect } from "react";
import { ScheduleState, UserProfile, Message } from "@/types";
import Calendar from "@/components/Calendar";
import GoalList from "@/components/GoalList";
import Chat from "@/components/Chat";
import Onboarding from "@/components/Onboarding";

const SCHEDULE_KEY = "goalkeeper-schedule";
const PROFILE_KEY = "goalkeeper-profile";
const MESSAGES_KEY = "goalkeeper-messages";
const INITIAL_STATE: ScheduleState = { events: [], goals: [] };

export default function HomePage() {
  const [schedule, setSchedule] = useState<ScheduleState>(INITIAL_STATE);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const s = localStorage.getItem(SCHEDULE_KEY);
    if (s) setSchedule(JSON.parse(s));
    const p = localStorage.getItem(PROFILE_KEY);
    if (p) setProfile(JSON.parse(p));
    const m = localStorage.getItem(MESSAGES_KEY);
    if (m) setMessages(JSON.parse(m));
  }, []);

  useEffect(() => {
    localStorage.setItem(SCHEDULE_KEY, JSON.stringify(schedule));
  }, [schedule]);

  useEffect(() => {
    localStorage.setItem(MESSAGES_KEY, JSON.stringify(messages));
  }, [messages]);

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
      const data: { message: string; schedule: ScheduleState } = await res.json();

      setMessages((prev) => [...prev, { role: "assistant", content: data.message }]);
      setSchedule(data.schedule);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleOnboardingComplete = async (p: UserProfile) => {
    setProfile(p);
    localStorage.setItem(PROFILE_KEY, JSON.stringify(p));

    const classLines = p.classes.map(
      (c) => `${c.name} on ${c.days.join("/")} from ${c.startTime} to ${c.endTime}`
    ).join(", ");

    const intro = `Hi! I'm ${p.name}, a ${p.year} ${p.major} student at ${p.school}.${
      classLines ? ` My classes: ${classLines}.` : ""
    }${p.goals.length ? ` My goals: ${p.goals.join("; ")}.` : ""} Please set up my initial schedule.`;

    await sendMessage(intro);
  };

  const handleClear = () => {
    setSchedule(INITIAL_STATE);
    setProfile(null);
    setMessages([]);
    localStorage.removeItem(SCHEDULE_KEY);
    localStorage.removeItem(PROFILE_KEY);
    localStorage.removeItem(MESSAGES_KEY);
  };

  return (
    <div className="h-screen overflow-hidden flex flex-col">
      {!profile && !loading && <Onboarding onComplete={handleOnboardingComplete} />}

      {/* Header */}
      <header className="border-b bg-white px-6 py-4 flex items-center justify-between shadow-sm flex-shrink-0">
        <h1 className="text-xl font-bold text-blue-600">GoalkeeperAI</h1>
        <div className="flex items-center gap-4">
          {profile && <span className="text-sm text-gray-500">Hey, {profile.name} 👋</span>}
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
            <GoalList goals={schedule.goals} />
          </div>
        </aside>

        {/* Calendar */}
        <main className="flex-1 overflow-hidden p-4">
          <Calendar events={schedule.events} />
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
