"use client";

import { useState } from "react";
import { ScheduleState, SchedulingOption } from "@/types";
import Calendar from "@/components/Calendar";

interface SchedulePickerModalProps {
  options: SchedulingOption[];
  schedule: ScheduleState;
  onSelect: (id: string) => void;
  onClose: () => void;
}

const OPTION_META: Record<string, { icon: string; accent: string; activeTab: string }> = {
  sleep:        { icon: "🌙", accent: "border-indigo-400 text-indigo-700 bg-indigo-50",  activeTab: "bg-indigo-600 text-white border-indigo-600"  },
  productivity: { icon: "⚡", accent: "border-amber-400 text-amber-700 bg-amber-50",    activeTab: "bg-amber-500 text-white border-amber-500"    },
  fitness:      { icon: "💪", accent: "border-green-400 text-green-700 bg-green-50",    activeTab: "bg-green-600 text-white border-green-600"    },
};

export default function SchedulePickerModal({ options, schedule, onSelect, onClose }: SchedulePickerModalProps) {
  const [activeId, setActiveId] = useState(options[0]?.id ?? "sleep");
  const active = options.find((o) => o.id === activeId) ?? options[0];
  const meta = OPTION_META[active.id] ?? OPTION_META.fitness;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col" style={{ maxHeight: "90vh" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0">
          <div>
            <h2 className="text-base font-semibold text-gray-800">Choose Your Schedule</h2>
            <p className="text-xs text-gray-400 mt-0.5">Preview each option on the calendar, then confirm your pick.</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors text-xl leading-none">×</button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 px-6 pt-4 flex-shrink-0">
          {options.map((opt) => {
            const m = OPTION_META[opt.id] ?? OPTION_META.fitness;
            const isActive = opt.id === activeId;
            return (
              <button
                key={opt.id}
                onClick={() => setActiveId(opt.id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${isActive ? m.activeTab : "border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"}`}
              >
                <span>{m.icon}</span>
                {opt.title}
              </button>
            );
          })}
        </div>

        {/* Main content */}
        <div className="flex flex-1 overflow-hidden gap-4 p-6 min-h-0">

          {/* Calendar preview */}
          <div className="flex-1 overflow-hidden">
            <Calendar
              events={schedule.events.filter((e) => e.source !== "pebble")}
              previewEvents={active.previewEvents}
            />
          </div>

          {/* Details panel */}
          <div className="w-56 flex flex-col gap-4 flex-shrink-0">
            <div className={`rounded-xl border p-4 space-y-3 ${meta.accent}`}>
              <p className="text-sm font-semibold">{meta.icon} {active.title}</p>
              <ul className="space-y-1.5">
                {active.points.map((pt, i) => (
                  <li key={i} className="text-xs leading-snug flex gap-1.5">
                    <span className="opacity-50 flex-shrink-0 mt-0.5">•</span>
                    <span>{pt}</span>
                  </li>
                ))}
              </ul>
            </div>

            <button
              onClick={() => onSelect(active.id)}
              className={`w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-colors ${
                activeId === "sleep" ? "bg-indigo-600 hover:bg-indigo-700" :
                activeId === "productivity" ? "bg-amber-500 hover:bg-amber-600" :
                "bg-green-600 hover:bg-green-700"
              }`}
            >
              Choose {active.title}
            </button>

            <button onClick={onClose} className="text-xs text-gray-400 hover:text-gray-600 text-center transition-colors">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
