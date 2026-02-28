"use client";

import { useState } from "react";
import { ScheduleState } from "@/types";
import Calendar from "@/components/Calendar";
import GoalList from "@/components/GoalList";
import ChatInput from "@/components/ChatInput";

const INITIAL_STATE: ScheduleState = { events: [], goals: [] };

export default function HomePage() {
  const [schedule, setSchedule] = useState<ScheduleState>(INITIAL_STATE);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b bg-white px-6 py-4 flex items-center justify-between shadow-sm">
        <h1 className="text-xl font-bold text-blue-600">GoalkeeperAI</h1>
        <span className="text-sm text-gray-400">Your AI personal scheduler</span>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar — Goals */}
        <aside className="w-64 border-r bg-white p-4 flex flex-col gap-4 overflow-y-auto">
          <h2 className="font-semibold text-sm text-gray-600 uppercase tracking-wide">Goals</h2>
          <GoalList goals={schedule.goals} />
        </aside>

        {/* Main — Calendar + Chat */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Calendar */}
          <div className="flex-1 overflow-y-auto p-6">
            <h2 className="font-semibold text-sm text-gray-600 uppercase tracking-wide mb-4">
              This Week
            </h2>
            <Calendar events={schedule.events} />
          </div>

          {/* Chat bar */}
          <div className="border-t bg-white px-6 py-4 space-y-2">
            {error && (
              <p className="text-sm text-red-500">{error}</p>
            )}
            <ChatInput onSubmit={handleInstruction} loading={loading} />
            <p className="text-xs text-gray-400">
              Try: &ldquo;I&apos;m a CS junior at UW-Madison, add my classes and daily LeetCode prep&rdquo;
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
