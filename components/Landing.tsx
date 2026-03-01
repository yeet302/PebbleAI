"use client";

import { useRef } from "react";
import { CalendarEvent } from "@/types";
import { parseICS } from "@/lib/ics-parser";

interface LandingProps {
  onImport: (events: CalendarEvent[]) => void;
  onSkip: () => void;
}

export default function Landing({ onImport, onSkip }: LandingProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const events = parseICS(text);
      onImport(events);
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 bg-white flex flex-col items-center justify-center z-50 p-8">
      <div className="max-w-md w-full text-center space-y-8">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <img src="/pebble_logo.png" alt="Pebble" className="w-56 h-56 rounded-3xl object-cover shadow-md" />
          <div>
            <h1 className="text-4xl font-bold text-gray-900">Pebble</h1>
            <p className="mt-2 text-gray-600">Find time in your busy life for what actually matters.</p>
          </div>
        </div>

        {/* Import */}
        <div className="space-y-3">
          <button
            onClick={() => inputRef.current?.click()}
            className="w-full rounded-2xl border-2 border-dashed border-gray-300 px-8 py-10 hover:border-blue-400 hover:bg-blue-50 transition-colors group"
          >
            <div className="flex flex-col items-center gap-3">
              <svg className="w-10 h-10 text-gray-300 group-hover:text-blue-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
              <div>
                <p className="font-semibold text-gray-700 group-hover:text-blue-600">Import your calendar</p>
                <p className="text-sm text-gray-600 mt-0.5">Drop your .ics file from Google, Apple, or Outlook</p>
              </div>
            </div>
          </button>
          <input ref={inputRef} type="file" accept=".ics" className="hidden" onChange={handleFile} />

          <button
            onClick={onSkip}
            className="w-full text-sm text-gray-600 hover:text-gray-800 py-2 transition-colors"
          >
            Start with a blank calendar →
          </button>
        </div>

        <p className="text-xs text-gray-500">Your calendar stays on your device. Nothing is uploaded.</p>
      </div>
    </div>
  );
}
