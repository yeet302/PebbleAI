"use client";

import { useState } from "react";
import { CalendarEvent } from "@/types";

interface CalendarProps {
  events: CalendarEvent[];
}

const HOUR_HEIGHT = 64;   // px per hour
const START_HOUR = 6;     // 6am
const END_HOUR = 23;      // 11pm
const TOTAL_HOURS = END_HOUR - START_HOUR;
const EVENT_INSET = 4;    // px gap between event and column edge
const SLOT_GAP = 3;       // px gap between overlapping events

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const categoryColors: Record<string, string> = {
  class:    "bg-blue-400 text-white border-blue-500",
  study:    "bg-yellow-400 text-white border-yellow-500",
  gym:      "bg-green-400 text-white border-green-500",
  work:     "bg-orange-400 text-white border-orange-500",
  goal:     "bg-purple-400 text-white border-purple-500",
  personal: "bg-gray-400 text-white border-gray-500",
};

function getWeekDays(weekOffset: number): string[] {
  const today = new Date();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7) + weekOffset * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d.toISOString().split("T")[0];
  });
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function getEventStyle(startTime: string, endTime: string) {
  const startMin = Math.max(timeToMinutes(startTime), START_HOUR * 60);
  const endMin = Math.min(timeToMinutes(endTime), END_HOUR * 60);
  const top = ((startMin - START_HOUR * 60) / 60) * HOUR_HEIGHT;
  const height = Math.max(((endMin - startMin) / 60) * HOUR_HEIGHT, 20);
  return { top, height };
}

// Simple overlap layout: assign column slots to overlapping events
function layoutEvents(events: CalendarEvent[]) {
  const sorted = [...events].sort((a, b) => a.startTime.localeCompare(b.startTime));
  const slots: CalendarEvent[][] = [];

  for (const event of sorted) {
    let placed = false;
    for (const slot of slots) {
      const last = slot[slot.length - 1];
      if (last.endTime <= event.startTime) {
        slot.push(event);
        placed = true;
        break;
      }
    }
    if (!placed) slots.push([event]);
  }

  const totalSlots = slots.length || 1;
  return sorted.map((event) => {
    const slotIndex = slots.findIndex((s) => s.includes(event));
    return { event, slotIndex, totalSlots };
  });
}

const HOURS = Array.from({ length: TOTAL_HOURS }, (_, i) => START_HOUR + i);

export default function Calendar({ events }: CalendarProps) {
  const [weekOffset, setWeekOffset] = useState(0);
  const weekDays = getWeekDays(weekOffset);
  const today = new Date().toISOString().split("T")[0];

  const label =
    weekOffset === 0 ? "This Week" :
    weekOffset === 1 ? "Next Week" :
    weekOffset === -1 ? "Last Week" :
    `${weekDays[0].slice(5)} – ${weekDays[6].slice(5)}`;

  return (
    <div className="flex flex-col h-full">
      {/* Week navigation */}
      <div className="flex items-center gap-3 mb-3 flex-shrink-0">
        <button onClick={() => setWeekOffset((w) => w - 1)}
          className="rounded px-2 py-1 text-sm text-gray-500 hover:bg-gray-100">
          ← Prev
        </button>
        <span className="text-sm font-semibold text-gray-700 w-32 text-center">{label}</span>
        <button onClick={() => setWeekOffset((w) => w + 1)}
          className="rounded px-2 py-1 text-sm text-gray-500 hover:bg-gray-100">
          Next →
        </button>
        {weekOffset !== 0 && (
          <button onClick={() => setWeekOffset(0)}
            className="rounded px-2 py-1 text-xs text-blue-500 hover:bg-blue-50">
            Today
          </button>
        )}
      </div>

      {/* Calendar grid */}
      <div className="flex flex-col flex-1 overflow-hidden border border-gray-200 rounded-xl">
        {/* Day headers — sticky */}
        <div className="flex flex-shrink-0 border-b border-gray-200 bg-white">
          <div className="w-14 flex-shrink-0" /> {/* spacer for time axis */}
          {DAY_NAMES.map((name, i) => {
            const isToday = weekDays[i] === today;
            return (
              <div key={name} className="flex-1 text-center py-3 text-xs font-semibold text-gray-500 border-l border-gray-100">
                <div>{name}</div>
                <div className={`text-base font-bold mt-0.5 w-8 h-8 flex items-center justify-center rounded-full mx-auto
                  ${isToday ? "bg-blue-500 text-white" : "text-gray-700"}`}>
                  {weekDays[i].slice(8)}
                </div>
              </div>
            );
          })}
        </div>

        {/* Scrollable time grid */}
        <div className="flex flex-1 overflow-y-auto">
          {/* Time axis */}
          <div className="w-14 flex-shrink-0 relative bg-white" style={{ height: TOTAL_HOURS * HOUR_HEIGHT }}>
            {HOURS.map((h) => (
              <div key={h} className="absolute right-2 text-xs text-gray-400"
                style={{ top: (h - START_HOUR) * HOUR_HEIGHT - 8 }}>
                {h === 12 ? "12pm" : h > 12 ? `${h - 12}pm` : `${h}am`}
              </div>
            ))}
          </div>

          {/* Day columns */}
          <div className="flex flex-1">
            {weekDays.map((date, di) => {
              const dayEvents = events.filter((e) => e.date === date);
              const laid = layoutEvents(dayEvents);

              return (
                <div key={date} className="flex-1 border-l border-gray-100 relative"
                  style={{ height: TOTAL_HOURS * HOUR_HEIGHT }}>
                  {/* Hour lines */}
                  {HOURS.map((h) => (
                    <div key={h} className="absolute w-full border-t border-gray-100"
                      style={{ top: (h - START_HOUR) * HOUR_HEIGHT }} />
                  ))}
                  {/* Half-hour lines */}
                  {HOURS.map((h) => (
                    <div key={`${h}h`} className="absolute w-full border-t border-gray-50"
                      style={{ top: (h - START_HOUR) * HOUR_HEIGHT + HOUR_HEIGHT / 2 }} />
                  ))}

                  {/* Events */}
                  {laid.map(({ event, slotIndex, totalSlots }) => {
                    const { top, height } = getEventStyle(event.startTime, event.endTime);
                    const left = `calc(${(slotIndex / totalSlots) * 100}% + ${EVENT_INSET}px)`;
                    const right = `calc(${((totalSlots - slotIndex - 1) / totalSlots) * 100}% + ${EVENT_INSET}px)`;
                    const colors = categoryColors[event.category] ?? categoryColors.personal;

                    return (
                      <div
                        key={event.id}
                        className={`absolute rounded-lg border-l-4 px-2 py-1 text-xs overflow-hidden cursor-pointer shadow-sm ${colors}`}
                        style={{ top, height, left, right }}
                        title={`${event.title}\n${event.startTime}–${event.endTime}${event.description ? `\n${event.description}` : ""}`}
                      >
                        <p className="font-semibold truncate leading-tight">{event.title}</p>
                        {height >= 32 && (
                          <p className="opacity-80 truncate">{event.startTime}–{event.endTime}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
