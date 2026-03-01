"use client";

import { useState } from "react";
import { CalendarEvent, EventCategory } from "@/types";

interface EventPopoverProps {
  event: CalendarEvent;
  onUpdate: (updated: CalendarEvent) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

const CATEGORIES: EventCategory[] = ["class", "study", "gym", "work", "goal", "personal"];

export default function EventPopover({ event, onUpdate, onDelete, onClose }: EventPopoverProps) {
  const [form, setForm] = useState({ ...event });
  const isImported = event.source === "imported";

  const set = (key: keyof CalendarEvent, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSave = () => {
    onUpdate(form);
    onClose();
  };

  const handleDelete = () => {
    onDelete(event.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">
              {isImported ? "Imported event" : "Pebble event"}
            </p>
            {isImported ? (
              <p className="font-semibold text-gray-800">{event.title}</p>
            ) : (
              <input
                className="font-semibold text-gray-800 text-base w-full focus:outline-none border-b border-transparent focus:border-blue-400 pb-0.5"
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
              />
            )}
          </div>
          <button onClick={onClose} className="text-gray-300 hover:text-gray-500 text-xl leading-none flex-shrink-0">×</button>
        </div>

        {/* Fields */}
        <div className="space-y-3">
          <div className="flex gap-2">
            <div className="flex-1 space-y-1">
              <label className="text-xs text-gray-400">Date</label>
              {isImported ? (
                <p className="text-sm text-gray-700">{event.date}</p>
              ) : (
                <input type="date" value={form.date} onChange={(e) => set("date", e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400" />
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <div className="flex-1 space-y-1">
              <label className="text-xs text-gray-400">Start</label>
              {isImported ? (
                <p className="text-sm text-gray-700">{event.startTime}</p>
              ) : (
                <input type="time" value={form.startTime} onChange={(e) => set("startTime", e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400" />
              )}
            </div>
            <div className="flex-1 space-y-1">
              <label className="text-xs text-gray-400">End</label>
              {isImported ? (
                <p className="text-sm text-gray-700">{event.endTime}</p>
              ) : (
                <input type="time" value={form.endTime} onChange={(e) => set("endTime", e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400" />
              )}
            </div>
          </div>

          {!isImported && (
            <div className="space-y-1">
              <label className="text-xs text-gray-400">Category</label>
              <select value={form.category} onChange={(e) => set("category", e.target.value as EventCategory)}
                className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400 capitalize">
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          )}

          {event.description && (
            <div className="space-y-1">
              <label className="text-xs text-gray-400">Notes</label>
              <p className="text-xs text-gray-500 leading-relaxed">{event.description}</p>
            </div>
          )}
        </div>

        {/* Actions */}
        {isImported ? (
          <p className="text-xs text-gray-300 italic">Imported events can&apos;t be edited here. Update them in your calendar app.</p>
        ) : (
          <div className="flex items-center justify-between pt-1">
            <button onClick={handleDelete} className="text-xs text-red-400 hover:text-red-600 transition-colors">
              Delete event
            </button>
            <button onClick={handleSave} className="rounded-lg bg-blue-600 text-white px-4 py-1.5 text-sm font-medium hover:bg-blue-700 transition-colors">
              Save
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
