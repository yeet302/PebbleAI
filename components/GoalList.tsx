"use client";

import { Goal, CalendarEvent } from "@/types";

interface GoalListProps {
  goals: Goal[];
  events: CalendarEvent[];
}

function daysUntil(deadline: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(deadline + "T00:00:00");
  return Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function deadlineLabel(days: number): string {
  if (days < 0) return "Overdue";
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  if (days <= 7) return `${days}d left`;
  if (days <= 30) return `${Math.ceil(days / 7)}w left`;
  return `${Math.ceil(days / 30)}mo left`;
}

function deadlineColor(days: number): string {
  if (days < 0) return "text-white bg-red-500";
  if (days <= 7) return "text-white bg-orange-500";
  if (days <= 30) return "text-white bg-amber-500";
  return "text-gray-700 bg-gray-200";
}

export default function GoalList({ goals, events }: GoalListProps) {
  if (goals.length === 0) {
    return (
      <p className="text-xs text-gray-500 italic leading-relaxed">
        No goals yet. Tell Pebble what you want to achieve and by when.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {goals.map((goal) => {
        const days = goal.deadline ? daysUntil(goal.deadline) : null;
        const sessions = events.filter((e) => e.goalId === goal.id && e.source === "pebble");
        const completed = sessions.filter((e) => e.completed).length;
        const total = sessions.length;
        const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

        return (
          <li key={goal.id} className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm space-y-2">
            <p className="font-medium text-sm text-gray-800 leading-snug">{goal.title}</p>

            {goal.description && (
              <p className="text-xs text-gray-600 leading-snug">{goal.description}</p>
            )}

            {/* Progress bar */}
            {total > 0 && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-gray-600">
                  <span>{completed} of {total} Pebbles done</span>
                  <span>{pct}%</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            )}

            <div className="flex items-center justify-between gap-2">
              {days !== null ? (
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${deadlineColor(days)}`}>
                  {deadlineLabel(days)}
                </span>
              ) : (
                <span className="text-xs text-red-400 italic">No deadline</span>
              )}
              <span className="text-xs text-gray-500">{goal.type}</span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
