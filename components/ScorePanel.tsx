"use client";

import { WeekScore } from "@/types";

interface ScorePanelProps {
  score: WeekScore | null;
  loading: boolean;
  onViewDetails: () => void;
}

function scoreColor(s: number) {
  if (s >= 80) return { bar: "bg-green-500", text: "text-green-600" };
  if (s >= 60) return { bar: "bg-blue-500",  text: "text-blue-600"  };
  if (s >= 40) return { bar: "bg-amber-500", text: "text-amber-600" };
  return          { bar: "bg-red-500",   text: "text-red-600"   };
}

function scoreLabel(s: number) {
  if (s >= 80) return "Great";
  if (s >= 60) return "Good";
  if (s >= 40) return "Fair";
  return "Needs Work";
}

function shortName(name: string) {
  if (name === "Cognitive Performance") return "Cognitive";
  if (name === "Social Time") return "Social";
  return name;
}

export default function ScorePanel({ score, loading, onViewDetails }: ScorePanelProps) {
  if (loading && !score) {
    return (
      <div className="space-y-2 px-1">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-3 bg-gray-100 rounded-full animate-pulse" style={{ width: `${70 + i * 7}%` }} />
        ))}
      </div>
    );
  }

  if (!score) return null;

  const overall = scoreColor(score.overall);

  return (
    <div className="space-y-2">
      {/* Overall — clickable to open full detail */}
      <button
        onClick={onViewDetails}
        className="w-full text-left rounded-xl border border-gray-100 bg-white p-3 shadow-sm hover:border-blue-200 transition-colors space-y-2"
      >
        <div className="flex items-center justify-between">
          <span className={`text-2xl font-bold ${overall.text}`}>{score.overall}</span>
          <span className="text-xs text-gray-400 font-medium">{scoreLabel(score.overall)}</span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all ${overall.bar}`} style={{ width: `${score.overall}%` }} />
        </div>
        <p className="text-xs text-gray-400 text-right leading-none">View details →</p>
      </button>

      {/* Pillar rows */}
      <div className="space-y-2 px-1">
        {score.categories.map((cat) => {
          const c = scoreColor(cat.score);
          return (
            <div key={cat.name}>
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-xs text-gray-500">{shortName(cat.name)}</span>
                <span className={`text-xs font-semibold ${c.text}`}>{cat.score}</span>
              </div>
              <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${c.bar}`} style={{ width: `${cat.score}%` }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Stale indicator shown while silently refreshing */}
      {loading && (
        <p className="text-xs text-gray-300 text-center">Refreshing…</p>
      )}
    </div>
  );
}
