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
            <p className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">
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
              <label className="text-xs text-gray-600">Date</label>
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
              <label className="text-xs text-gray-600">Start</label>
              {isImported ? (
                <p className="text-sm text-gray-700">{event.startTime}</p>
              ) : (
                <input type="time" value={form.startTime} onChange={(e) => set("startTime", e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400" />
              )}
            </div>
            <div className="flex-1 space-y-1">
              <label className="text-xs text-gray-600">End</label>
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
              <label className="text-xs text-gray-600">Category</label>
              <select value={form.category} onChange={(e) => set("category", e.target.value as EventCategory)}
                className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400 capitalize">
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          )}

          {event.description && (
            <div className="space-y-1">
              <label className="text-xs text-gray-600">Notes</label>
              <p className="text-xs text-gray-700 leading-relaxed">{event.description}</p>
            </div>
          )}
        </div>

        {/* Complete toggle — Pebble events only */}
        {!isImported && (
          <button
            onClick={() => setForm((f) => ({ ...f, completed: !f.completed }))}
            className={`w-full flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
              form.completed
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-gray-50 text-gray-500 border border-gray-200 hover:border-green-300 hover:text-green-600"
            }`}
          >
            <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${form.completed ? "bg-green-500 border-green-500" : "border-gray-300"}`}>
              {form.completed && <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 10" fill="currentColor"><path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>}
            </span>
            {form.completed ? "Completed" : "Mark as complete"}
          </button>
        )}

        {/* Actions */}
        {isImported ? (
          <p className="text-xs text-gray-500 italic">Imported events can&apos;t be edited here. Update them in your calendar app.</p>
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
