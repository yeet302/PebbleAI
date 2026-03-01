import { GoogleGenerativeAI } from "@google/generative-ai";
import { ScheduleState, UserProfile, SchedulingOption, OptimizationMode } from "@/types";
import { parseJSON } from "@/lib/gemini";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const MODE_CONFIGS: Record<OptimizationMode, { title: string; rules: string }> = {
  sleep: {
    title: "Sleep Optimized",
    rules: `Goal: protect sleep quality and circadian rhythm.
- Gym/cardio events → place before 18:00 (no exercise within 3 h of sleepTime).
- Study/work/goal events → finish at least 90 min before sleepTime.
- Prefer early morning (07:00–09:00) for workouts — cortisol peaks naturally then.`,
  },
  productivity: {
    title: "Productivity Optimized",
    rules: `Goal: maximise cognitive output during peak hours.
- Study/work/goal events → cluster during energyPeak window (morning = 08:00–12:00, evening = 17:00–21:00).
- Cap each block at 90 min; leave ≥15 min gap between consecutive deep-work blocks.
- Gym/cardio events → push to post-lunch dip (13:00–15:00) or evening to protect peak hours.`,
  },
  fitness: {
    title: "Fitness Optimized",
    rules: `Goal: maximise training adaptation and consistency.
- Gym/cardio events → schedule at 06:30–08:30 (highest adherence window).
- Ensure ≥48 h between same-category gym events on consecutive days.
- Study/work/goal events → shift to mid-morning (09:00–11:00) or afternoon after workout.`,
  },
};

function buildModePrompt(mode: OptimizationMode, profileBullets: string): string {
  const { title, rules } = MODE_CONFIGS[mode];
  return `You are Pebble, a scheduling optimizer. Reschedule the given Pebble events for the "${title}" strategy.

USER PROFILE:
${profileBullets}

OPTIMIZATION RULES:
${rules}

GENERAL RULES:
- Preserve exact event IDs (copy character-for-character).
- Preserve title, date, category, source, goalId, recurring — only change startTime and endTime.
- Duration (endTime − startTime) must stay the same as the original.
- Do not add or remove events.
- Avoid overlapping with the imported events provided.
- Times must differ visibly from a neutral schedule — move events meaningfully, not just ±15 min.

RESPONSE FORMAT — return a single JSON object only, no markdown:
{
  "id": "${mode}",
  "title": "${title}",
  "points": ["<specific bullet>", "<specific bullet>", "<specific bullet>"],
  "rationale": "<2 coaching sentences explaining the timing choices>",
  "previewEvents": [ <full CalendarEvent objects with same IDs, only times changed> ]
}`;
}

async function generateOneOption(
  mode: OptimizationMode,
  profileBullets: string,
  userContext: string
): Promise<SchedulingOption> {
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  const result = await model.generateContent([
    { text: buildModePrompt(mode, profileBullets) },
    { text: userContext },
  ]);
  return parseJSON(result.response.text()) as SchedulingOption;
}

export async function generateRescheduleOptions(
  schedule: ScheduleState,
  profile: UserProfile | null,
  mode: OptimizationMode
): Promise<SchedulingOption> {
  const profileBullets = profile
    ? [
        `- Name: ${profile.name}`,
        `- Wake time: ${profile.wakeTime}`,
        `- Sleep time: ${profile.sleepTime}`,
        `- Energy peak: ${profile.energyPeak}`,
        `- Preferred Pebble length: ${profile.sessionLengthMinutes} minutes`,
        `- Free days: ${profile.freeDays.length > 0 ? profile.freeDays.join(", ") : "none specified"}`,
        profile.notes ? `- Notes: ${profile.notes}` : null,
      ]
        .filter(Boolean)
        .join("\n")
    : "- No profile provided";

  const pebbleEvents = schedule.events.filter((e) => e.source === "pebble");
  const importedEvents = schedule.events
    .filter((e) => e.source === "imported")
    .map((e) => ({ id: e.id, title: e.title, date: e.date, startTime: e.startTime, endTime: e.endTime }));

  const userContext = `Pebble events to reschedule:
${JSON.stringify(pebbleEvents, null, 2)}

Imported events (do not conflict):
${JSON.stringify(importedEvents, null, 2)}

Return the JSON object only.`;

  return generateOneOption(mode, profileBullets, userContext);
}
