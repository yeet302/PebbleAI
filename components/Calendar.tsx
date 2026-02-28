"use client";

import { CalendarEvent } from "@/types";

interface CalendarProps {
  events: CalendarEvent[];
}

const categoryColors: Record<string, string> = {
  class:    "bg-blue-100 border-blue-400 text-blue-800",
  study:    "bg-yellow-100 border-yellow-400 text-yellow-800",
  gym:      "bg-green-100 border-green-400 text-green-800",
  work:     "bg-orange-100 border-orange-400 text-orange-800",
  goal:     "bg-purple-100 border-purple-400 text-purple-800",
  personal: "bg-gray-100 border-gray-400 text-gray-800",
};

function getWeekDays(): string[] {
  const today = new Date();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d.toISOString().split("T")[0];
  });
}

export default function Calendar({ events }: CalendarProps) {
  const weekDays = getWeekDays();
  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const eventsByDay = weekDays.map((date) =>
    events.filter((e) => e.date === date).sort((a, b) => a.startTime.localeCompare(b.startTime))
  );

  return (
    <div className="grid grid-cols-7 gap-1 text-xs">
      {dayNames.map((name, i) => (
        <div key={name} className="text-center font-semibold text-gray-500 pb-1">
          <div>{name}</div>
          <div className="text-gray-400 font-normal">{weekDays[i].slice(5)}</div>
        </div>
      ))}
      {eventsByDay.map((dayEvents, i) => (
        <div key={weekDays[i]} className="min-h-32 rounded-lg bg-gray-50 p-1 space-y-1">
          {dayEvents.length === 0 && (
            <p className="text-gray-300 text-center mt-4">—</p>
          )}
          {dayEvents.map((event) => (
            <div
              key={event.id}
              className={`rounded border-l-2 px-1.5 py-1 ${categoryColors[event.category] ?? categoryColors.personal}`}
            >
              <p className="font-medium truncate">{event.title}</p>
              <p className="text-gray-500">{event.startTime}–{event.endTime}</p>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
