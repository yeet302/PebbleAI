"use client";

import { useState } from "react";
import { CalendarEvent } from "@/types";

interface WeeklyReviewProps {
  events: CalendarEvent[];
  onSubmit: (message: string) => void;
  onClose: () => void;
}

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function getCurrentWeekDays(): string[] {
  const today = new Date();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d.toISOString().split("T")[0];
  });
}

const categoryColors: Record<string, string> = {
  class:    "bg-blue-100 text-blue-700",
  study:    "bg-yellow-100 text-yellow-700",
  gym:      "bg-green-100 text-green-700",
  work:     "bg-orange-100 text-orange-700",
  goal:     "bg-purple-100 text-purple-700",
  personal: "bg-gray-100 text-gray-600",
};

export default function WeeklyReview({ events, onSubmit, onClose }: WeeklyReviewProps) {
  const [reflection, setReflection] = useState("");
  const weekDays = getCurrentWeekDays();

  const weekEvents = events.filter((e) => weekDays.includes(e.date));
  const byDay = weekDays.map((date, i) => ({
    label: DAY_NAMES[i],
    date,
    events: weekEvents.filter((e) => e.date === date).sort((a, b) => a.startTime.localeCompare(b.startTime)),
  }));

  const totalEvents = weekEvents.length;
  const completedDays = byDay.filter((d) => d.events.length > 0).length;

  const handleSubmit = () => {
    if (!reflection.trim()) return;
    const summary = weekEvents.length > 0
      ? `This week I had ${totalEvents} scheduled events across ${completedDays} days.`
      : "I had no scheduled events this week.";

    onSubmit(`Weekly review: ${summary} Here's my reflection: ${reflection.trim()}`);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden" style={{ maxHeight: "85vh" }}>

        {/* Header */}
        <div className="px-6 py-5 border-b flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Weekly Review</h2>
            <p className="text-xs text-gray-400 mt-0.5">Reflect on your week and the AI will adjust next week</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        {/* Week summary */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          <div className="grid grid-cols-7 gap-2">
            {byDay.map((day) => (
              <div key={day.date} className="space-y-1">
                <p className="text-xs font-medium text-gray-400 text-center">{day.label}</p>
                {day.events.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-gray-200 h-16 flex items-center justify-center">
                    <span className="text-xs text-gray-300">—</span>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {day.events.map((e) => (
                      <div
                        key={e.id}
                        className={`rounded-md px-1.5 py-1 text-xs truncate ${categoryColors[e.category] ?? "bg-gray-100 text-gray-600"}`}
                        title={`${e.title} ${e.startTime}–${e.endTime}`}
                      >
                        {e.title}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Stats */}
          <div className="flex gap-4 text-center">
            <div className="flex-1 rounded-xl bg-gray-50 py-3">
              <p className="text-2xl font-bold text-gray-800">{totalEvents}</p>
              <p className="text-xs text-gray-400">events this week</p>
            </div>
            <div className="flex-1 rounded-xl bg-gray-50 py-3">
              <p className="text-2xl font-bold text-gray-800">{completedDays}</p>
              <p className="text-xs text-gray-400">active days</p>
            </div>
            <div className="flex-1 rounded-xl bg-gray-50 py-3">
              <p className="text-2xl font-bold text-gray-800">{7 - completedDays}</p>
              <p className="text-xs text-gray-400">free days</p>
            </div>
          </div>

          {/* Reflection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              How did your week go? What worked, what didn&apos;t?
            </label>
            <textarea
              value={reflection}
              onChange={(e) => setReflection(e.target.value)}
              placeholder="e.g. I skipped the gym twice. Study blocks were too long. I want more buffer time in the evenings..."
              rows={4}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex items-center justify-end gap-3 flex-shrink-0">
          <button onClick={onClose} className="text-sm text-gray-400 hover:text-gray-600">Cancel</button>
          <button
            onClick={handleSubmit}
            disabled={!reflection.trim()}
            className="rounded-lg bg-green-800 text-white px-5 py-2 text-sm font-medium hover:bg-green-900 disabled:opacity-40"
          >
            Send to AI →
          </button>
        </div>
      </div>
    </div>
  );
}
