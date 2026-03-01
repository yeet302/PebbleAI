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
          <img src="/pebble_logo.png" alt="Pebble" className="w-56 h-56 rounded-3xl object-cover" />
          <div>
            <h1 className="text-4xl font-bold text-gray-900">Pebble</h1>
            <p className="mt-2 text-gray-600">Your health, scheduled.</p>
          </div>
        </div>

        {/* Calendar connection options */}
        <div className="space-y-3">
          {/* Google Calendar OAuth */}
          <a
            href="/api/auth/google"
            className="w-full flex items-center justify-center gap-3 rounded-2xl bg-white border-2 border-gray-200 px-8 py-5 hover:border-green-400 hover:bg-green-50 transition-colors group shadow-sm"
          >
            <svg className="w-6 h-6 flex-shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <div className="text-left">
              <p className="font-semibold text-gray-800 group-hover:text-green-800">Connect Google Calendar</p>
              <p className="text-sm text-gray-500">Sync automatically on every open</p>
            </div>
          </a>

          <div className="flex items-center gap-3 text-gray-400 text-xs">
            <div className="flex-1 border-t border-gray-200" />
            <span>or</span>
            <div className="flex-1 border-t border-gray-200" />
          </div>

          {/* ICS import */}
          <button
            onClick={() => inputRef.current?.click()}
            className="w-full rounded-2xl border-2 border-dashed border-gray-300 px-8 py-6 hover:border-green-400 hover:bg-green-50 transition-colors group"
          >
            <div className="flex flex-col items-center gap-2">
              <svg className="w-8 h-8 text-gray-300 group-hover:text-green-600 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
              <div>
                <p className="font-semibold text-gray-700 group-hover:text-green-800">Import .ics file</p>
                <p className="text-sm text-gray-500 mt-0.5">Apple, Outlook, or generic calendar export</p>
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

        <p className="text-xs text-gray-500">Your data stays on your device. Nothing is stored on our servers.</p>
      </div>
    </div>
  );
}
