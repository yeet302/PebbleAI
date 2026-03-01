"use client";

import { Goal } from "@/types";

interface GoalListProps {
  goals: Goal[];
}

const typeColors: Record<Goal["type"], string> = {
  "short-term": "bg-green-100 text-green-800",
  "long-term": "bg-purple-100 text-purple-800",
};

export default function GoalList({ goals }: GoalListProps) {
  if (goals.length === 0) {
    return (
      <p className="text-sm text-gray-400 italic dark:text-slate-400">
        No goals yet. Try: &ldquo;I want to land a software internship by May&rdquo;
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {goals.map((goal) => (
        <li key={goal.id} className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm dark:bg-slate-800 dark:border-slate-700">
          <div className="flex items-start justify-between gap-2">
            <span className="font-medium text-sm dark:text-slate-100">{goal.title}</span>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${typeColors[goal.type]}`}>
              {goal.type}
            </span>
          </div>
          {goal.description && (
            <p className="mt-1 text-xs text-gray-500 dark:text-slate-300">{goal.description}</p>
          )}
          {goal.deadline && (
            <p className="mt-1 text-xs text-gray-400 dark:text-slate-400">Due: {goal.deadline}</p>
          )}
        </li>
      ))}
    </ul>
  );
}
