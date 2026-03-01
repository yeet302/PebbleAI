"use client";

import { useEffect, useState } from "react";
import { ScheduleState, UserProfile, WeekScore } from "@/types";

interface ScoreCardProps {
  schedule: ScheduleState;
  profile: UserProfile | null;
  onClose: () => void;
}

function scoreColors(score: number) {
  if (score >= 80) return { bar: "bg-green-500", text: "text-green-600", ring: "border-green-400", bg: "bg-green-50" };
  if (score >= 60) return { bar: "bg-blue-500",  text: "text-blue-600",  ring: "border-blue-400",  bg: "bg-blue-50"  };
  if (score >= 40) return { bar: "bg-amber-500", text: "text-amber-600", ring: "border-amber-400", bg: "bg-amber-50" };
  return               { bar: "bg-red-500",   text: "text-red-600",   ring: "border-red-400",   bg: "bg-red-50"   };
}

function scoreLabel(score: number) {
  if (score >= 80) return "Great";
  if (score >= 60) return "Good";
  if (score >= 40) return "Fair";
  return "Needs Work";
}

export default function ScoreCard({ schedule, profile, onClose }: ScoreCardProps) {
  const [data, setData] = useState<WeekScore | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/score", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ schedule, profile }),
    })
      .then((r) => r.json())
      .then((json) => {
        if (json.error) throw new Error(json.error);
        setData(json as WeekScore);
      })
      .catch((err) => setError(err.message ?? "Something went wrong"));
  }, []);

  const overallColors = data ? scoreColors(data.overall) : null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-base font-semibold text-gray-800">Wellness Score</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors text-xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Loading */}
        {!data && !error && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="flex gap-1.5">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
                  style={{ animationDelay: `${i * 150}ms` }}
                />
              ))}
            </div>
            <p className="text-xs text-gray-400">Analyzing your week…</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="px-6 py-8 text-center">
            <p className="text-sm text-red-500">{error}</p>
          </div>
        )}

        {/* Content */}
        {data && overallColors && (
          <div className="px-6 py-5 space-y-5">
            {/* Overall score */}
            <div className={`flex flex-col items-center gap-1 py-4 rounded-xl border-2 ${overallColors.ring} ${overallColors.bg}`}>
              <span className={`text-5xl font-bold ${overallColors.text}`}>{data.overall}</span>
              <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">/ 100 · {scoreLabel(data.overall)}</span>
            </div>

            {/* Category list */}
            <div className="flex flex-col gap-3">
              {data.categories.map((cat) => {
                const c = scoreColors(cat.score);
                return (
                  <div key={cat.name} className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-700">{cat.name}</span>
                      <span className={`text-sm font-bold ${c.text}`}>{cat.score}</span>
                    </div>
                    {/* Progress bar */}
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${c.bar}`}
                        style={{ width: `${cat.score}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 leading-snug">{cat.insight}</p>
                    <p className="text-xs text-gray-400 italic leading-snug">{cat.tip}</p>
                  </div>
                );
              })}
            </div>

            {/* Summary */}
            <p className="text-sm text-gray-600 leading-relaxed border-t pt-4">{data.summary}</p>
          </div>
        )}
      </div>
    </div>
  );
}
