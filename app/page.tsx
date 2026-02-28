"use client";

import { useState, useEffect } from "react";
import { ScheduleState, UserProfile } from "@/types";
import Calendar from "@/components/Calendar";
import GoalList from "@/components/GoalList";
import ChatInput from "@/components/ChatInput";
import Onboarding from "@/components/Onboarding";

const SCHEDULE_KEY = "goalkeeper-schedule";
const PROFILE_KEY = "goalkeeper-profile";
const INITIAL_STATE: ScheduleState = { events: [], goals: [] };

export default function HomePage() {
  const [schedule, setSchedule] = useState<ScheduleState>(INITIAL_STATE);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const savedSchedule = localStorage.getItem(SCHEDULE_KEY);
    if (savedSchedule) setSchedule(JSON.parse(savedSchedule));

    const savedProfile = localStorage.getItem(PROFILE_KEY);
    if (savedProfile) setProfile(JSON.parse(savedProfile));
  }, []);

  useEffect(() => {
    localStorage.setItem(SCHEDULE_KEY, JSON.stringify(schedule));
  }, [schedule]);

  const handleInstruction = async (instruction: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentState: schedule, instruction }),
      });
      if (!res.ok) throw new Error("Failed to update schedule");
      const updated: ScheduleState = await res.json();
      setSchedule(updated);
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

    const goalLines = p.goals.join("; ");

    const instruction = `My name is ${p.name}. I'm a ${p.year} ${p.major} student at ${p.school}.
${classLines ? `My classes are: ${classLines}.` : "I have no classes yet."}
${goalLines ? `My goals are: ${goalLines}.` : ""}
Please generate a complete schedule for the next 4 weeks including my classes, study blocks, and any events that support my goals.`;

    await handleInstruction(instruction);
  };

  const handleClear = () => {
    setSchedule(INITIAL_STATE);
    setProfile(null);
    localStorage.removeItem(SCHEDULE_KEY);
    localStorage.removeItem(PROFILE_KEY);
  };

  return (
    <div className="min-h-screen flex flex-col">
      {!profile && <Onboarding onComplete={handleOnboardingComplete} />}

      {/* Header */}
      <header className="border-b bg-white px-6 py-4 flex items-center justify-between shadow-sm">
        <h1 className="text-xl font-bold text-blue-600">GoalkeeperAI</h1>
        <div className="flex items-center gap-4">
          {profile && (
            <span className="text-sm text-gray-500">Hey, {profile.name} 👋</span>
          )}
          <span className="text-sm text-gray-400">Your AI personal scheduler</span>
          <button
            onClick={handleClear}
            className="text-xs text-gray-400 hover:text-red-500"
          >
            Clear
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar — Goals */}
        <aside className="w-64 border-r bg-white p-4 flex flex-col gap-4 overflow-y-auto">
          <h2 className="font-semibold text-sm text-gray-600 uppercase tracking-wide">Goals</h2>
          <GoalList goals={schedule.goals} />
        </aside>

        {/* Main — Calendar + Chat */}
        <main className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-hidden p-6">
            <Calendar events={schedule.events} />
          </div>

          <div className="border-t bg-white px-6 py-4 space-y-2">
            {loading && (
              <p className="text-sm text-blue-500 animate-pulse">Generating your schedule...</p>
            )}
            {error && (
              <p className="text-sm text-red-500">{error}</p>
            )}
            <ChatInput onSubmit={handleInstruction} loading={loading} />
            <p className="text-xs text-gray-400">
              Try: &ldquo;Add 1 hour of LeetCode every morning&rdquo; or &ldquo;I dropped CS 301&rdquo;
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
