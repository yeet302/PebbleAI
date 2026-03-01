"use client";

import { useEffect, useRef, useState } from "react";
import { Message, SchedulingOption } from "@/types";

const OPTION_STYLES: Record<string, { icon: string; border: string; hover: string; iconBg: string }> = {
  sleep:        { icon: "🌙", border: "border-indigo-100", hover: "hover:border-indigo-300 hover:bg-indigo-50", iconBg: "bg-indigo-100" },
  productivity: { icon: "⚡", border: "border-amber-100",  hover: "hover:border-amber-300 hover:bg-amber-50",   iconBg: "bg-amber-100"  },
  fitness:      { icon: "💪", border: "border-green-100",  hover: "hover:border-green-300 hover:bg-green-50",   iconBg: "bg-green-100"  },
};

interface ChatProps {
  messages: Message[];
  onSend: (text: string) => void;
  loading: boolean;
  pendingOptions?: SchedulingOption[] | null;
  onSelectOption?: (id: string) => void;
}

export default function Chat({ messages, onSend, loading, pendingOptions, onSelectOption }: ChatProps) {
  const [value, setValue] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, pendingOptions]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim() || loading) return;
    onSend(value.trim());
    setValue("");
  };

  return (
    <div className="flex flex-col h-full">
      {/* Message history */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 && (
          <p className="text-sm text-gray-500 italic text-center mt-4">
            Tell me your goals or ask me to update your schedule.
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                m.role === "user"
                  ? "bg-blue-600 text-white rounded-br-sm"
                  : "bg-gray-100 text-gray-800 rounded-bl-sm"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-4 py-2">
              <span className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </span>
            </div>
          </div>
        )}

        {/* Scheduling option cards */}
        {!loading && pendingOptions && pendingOptions.length > 0 && (
          <div className="space-y-2 pt-1">
            {pendingOptions.map((opt) => {
              const s = OPTION_STYLES[opt.id] ?? OPTION_STYLES.fitness;
              return (
                <button
                  key={opt.id}
                  onClick={() => onSelectOption?.(opt.id)}
                  className={`flex items-start gap-3 w-full text-left rounded-xl border bg-white p-3 transition-colors ${s.border} ${s.hover}`}
                >
                  <span className={`text-lg rounded-lg p-1.5 ${s.iconBg} flex-shrink-0 leading-none`}>{s.icon}</span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-gray-800">{opt.title}</p>
                    <ul className="mt-1 space-y-0.5">
                      {opt.points.map((pt, j) => (
                        <li key={j} className="text-xs text-gray-500 leading-snug flex gap-1">
                          <span className="text-gray-300 flex-shrink-0">•</span>
                          <span>{pt}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex gap-2 px-4 py-3 border-t border-gray-200">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="e.g. I want to prep for coding interviews"
          className="flex-1 rounded-full border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !value.trim()}
          className="rounded-full bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}
