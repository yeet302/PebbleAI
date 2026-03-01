"use client";

import { useState } from "react";

interface ChatInputProps {
  onSubmit: (instruction: string) => void;
  loading: boolean;
}

export default function ChatInput({ onSubmit, loading }: ChatInputProps) {
  const [value, setValue] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim() || loading) return;
    onSubmit(value.trim());
    setValue("");
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder='e.g. "Add CS 301 every Mon/Wed 10-11am" or "I want to do LeetCode daily for 1 hour"'
        className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
        disabled={loading}
      />
      <button
        type="submit"
        disabled={loading || !value.trim()}
        className="rounded-lg bg-green-800 px-4 py-2 text-sm font-medium text-white hover:bg-green-900 disabled:opacity-50"
      >
        {loading ? "Thinking..." : "Send"}
      </button>
    </form>
  );
}
