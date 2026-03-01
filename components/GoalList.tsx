"use client";

import { Goal } from "@/types";

interface GoalListProps {
  goals: Goal[];
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
  if (days < 0) return "text-red-600 bg-red-50";
  if (days <= 7) return "text-orange-600 bg-orange-50";
  if (days <= 30) return "text-yellow-700 bg-yellow-50";
  return "text-gray-500 bg-gray-50";
}

export default function GoalList({ goals }: GoalListProps) {
  if (goals.length === 0) {
    return (
      <p className="text-xs text-gray-400 italic leading-relaxed">
        No goals yet. Tell Pebble what you want to achieve and by when.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {goals.map((goal) => {
        const days = goal.deadline ? daysUntil(goal.deadline) : null;
        return (
          <li key={goal.id} className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm space-y-1.5">
            <p className="font-medium text-sm text-gray-800 leading-snug">{goal.title}</p>

            {goal.description && (
              <p className="text-xs text-gray-400 leading-snug">{goal.description}</p>
            )}

            <div className="flex items-center justify-between gap-2">
              {days !== null ? (
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${deadlineColor(days)}`}>
                  {deadlineLabel(days)}
                </span>
              ) : (
                <span className="text-xs text-red-400 italic">No deadline set</span>
              )}
              <span className="text-xs text-gray-300">{goal.type}</span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
