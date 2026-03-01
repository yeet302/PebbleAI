"use client";

import { useState } from "react";

export interface LogEntry {
  ts: string;
  type: "info" | "success" | "error" | "warn";
  label: string;
  data?: unknown;
}

interface DebugConsoleProps {
  logs: LogEntry[];
  onClear: () => void;
}

const typeStyles: Record<LogEntry["type"], string> = {
  info:    "text-blue-400",
  success: "text-green-400",
  error:   "text-red-400",
  warn:    "text-yellow-400",
};

export default function DebugConsole({ logs, onClear }: DebugConsoleProps) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);

  return (
    <div className="fixed bottom-20 right-4 z-50 w-96 font-mono text-xs">
      {/* Toggle button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="ml-auto flex items-center gap-1.5 rounded-lg bg-gray-900 text-gray-300 px-3 py-1.5 hover:bg-gray-800 shadow-lg"
      >
        <span className={`w-2 h-2 rounded-full ${logs.some(l => l.type === "error") ? "bg-red-400" : "bg-green-400"}`} />
        Debug ({logs.length})
      </button>

      {open && (
        <div className="mt-1 rounded-xl bg-gray-950 border border-gray-800 shadow-2xl flex flex-col overflow-hidden" style={{ height: 360 }}>
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-gray-800 flex-shrink-0">
            <span className="text-gray-400 font-semibold">Console</span>
            <button onClick={onClear} className="text-gray-600 hover:text-gray-300 text-xs">Clear</button>
          </div>

          {/* Log entries */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {logs.length === 0 && (
              <p className="text-gray-600 italic p-2">No logs yet.</p>
            )}
            {logs.map((log, i) => (
              <div key={i}>
                <button
                  className="w-full text-left flex items-start gap-2 hover:bg-gray-900 rounded px-2 py-1"
                  onClick={() => setExpanded(expanded === i ? null : i)}
                >
                  <span className="text-gray-600 flex-shrink-0">{log.ts}</span>
                  <span className={`flex-shrink-0 ${typeStyles[log.type]}`}>
                    [{log.type.toUpperCase()}]
                  </span>
                  <span className="text-gray-300 truncate">{log.label}</span>
                  {log.data !== undefined && (
                    <span className="text-gray-600 ml-auto flex-shrink-0">{expanded === i ? "▲" : "▼"}</span>
                  )}
                </button>
                {expanded === i && log.data !== undefined && (
                  <pre className="ml-4 mt-1 p-2 bg-gray-900 rounded text-gray-400 text-xs overflow-x-auto whitespace-pre-wrap break-all">
                    {JSON.stringify(log.data, null, 2)}
                  </pre>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
