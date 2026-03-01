"use client";

interface GoalPickerProps {
  onSelect: (message: string) => void;
  onClose: () => void;
}

const OPTIONS = [
  {
    icon: "🌙",
    title: "Sleep Optimized",
    description: "Build consistent sleep timing using circadian science — wind-down routines, workout cutoffs, wake anchors.",
    message: `[SLEEP OPTIMIZATION] I want to add a goal and have it scheduled around sleep science. Use these rules strictly:
- No intense exercise within 3 hours of my sleep time (raises core body temperature, delays sleep onset)
- No stimulating cognitive work within 90 minutes of bed (elevates cortisol)
- Schedule a wind-down Pebble 30–45 min before sleep time
- Prefer mornings for any intense activity
- Protect my wake time as a circadian anchor

For every Pebble you place, give me one sentence explaining why that time serves my sleep. What goal do I want to build around?`,
    colors: "hover:border-indigo-300 hover:bg-indigo-50",
    iconBg: "bg-indigo-100",
  },
  {
    icon: "⚡",
    title: "Productivity Optimized",
    description: "Protect peak cognitive hours with ultradian work blocks, strategic breaks, and energy-aligned scheduling.",
    message: `[PRODUCTIVITY OPTIMIZATION] I want to add a goal and have it scheduled around cognitive performance science. Use these rules strictly:
- Schedule all deep work during my energy peak window — that's when prefrontal cortex function is highest
- Cap each deep work Pebble at 90 minutes (ultradian rhythm limit)
- Always leave at least 15 minutes between consecutive deep work blocks
- Put low-focus tasks in the early afternoon energy dip (13:00–15:00)
- Never place deep work right after a heavy meal

For every Pebble you place, give me one sentence explaining why that time maximizes my cognitive output. What goal do I want to build around?`,
    colors: "hover:border-amber-300 hover:bg-amber-50",
    iconBg: "bg-amber-100",
  },
  {
    icon: "💪",
    title: "Fitness Optimized",
    description: "Hit WHO guidelines with science-backed session spacing, progressive overload, and recovery windows.",
    message: `[FITNESS OPTIMIZATION] I want to add a goal and have it scheduled around training science. Use these rules strictly:
- Allow 48–72 hours between sessions targeting the same muscle group (muscle protein synthesis window)
- Prefer morning slots — morning exercisers show 25% better adherence rates
- Never schedule two high-intensity sessions back-to-back; alternate with active recovery
- Start at 3 sessions/week (progressive overload: build volume before intensity)
- Note the 30-min post-workout nutrition window when placing sessions

For every Pebble you place, give me one sentence explaining why that timing and frequency follows training science. What fitness goal do I want to work toward?`,
    colors: "hover:border-green-300 hover:bg-green-50",
    iconBg: "bg-green-100",
  },
];

export default function GoalPicker({ onSelect, onClose }: GoalPickerProps) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="text-sm font-semibold text-gray-800">What kind of goal?</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors text-xl leading-none"
          >
            ×
          </button>
        </div>
        <div className="p-3 flex flex-col gap-2">
          {OPTIONS.map((opt) => (
            <button
              key={opt.title}
              onClick={() => { onSelect(opt.message); onClose(); }}
              className={`flex items-start gap-3 w-full text-left rounded-xl border border-gray-100 bg-white p-3 transition-colors ${opt.colors}`}
            >
              <span className={`text-xl rounded-lg p-1.5 ${opt.iconBg} flex-shrink-0`}>{opt.icon}</span>
              <div>
                <p className="text-sm font-medium text-gray-800">{opt.title}</p>
                <p className="text-xs text-gray-500 leading-snug mt-0.5">{opt.description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
