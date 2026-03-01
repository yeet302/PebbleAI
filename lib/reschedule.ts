import { GoogleGenerativeAI } from "@google/generative-ai";
import { ScheduleState, UserProfile, SchedulingOption } from "@/types";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const RESCHEDULE_PROMPT = `You are Pebble, a scheduling optimizer. Given the user's existing Pebble events and goals, produce EXACTLY 3 rescheduled versions of those events. Each version uses a different optimization strategy; the times MUST differ visibly between the 3 versions. Same event IDs, same dates, same number of events — only startTime and endTime change.

USER PROFILE:
{PROFILE_PLACEHOLDER}

CRITICAL: The 3 versions must have meaningfully different start times for each event — not minor ±15 min tweaks. A viewer switching between tabs on a calendar should immediately notice the events moving to different parts of the day.

RESPONSE FORMAT — return a JSON array only, no markdown fences:
[
  { "id": "sleep", "title": "Sleep Optimized", "points": ["...", "...", "..."], "rationale": "...", "previewEvents": [ <full event objects> ] },
  { "id": "productivity", "title": "Productivity Optimized", "points": ["...", "...", "..."], "rationale": "...", "previewEvents": [ <full event objects> ] },
  { "id": "fitness", "title": "Fitness Optimized", "points": ["...", "...", "..."], "rationale": "...", "previewEvents": [ <full event objects> ] }
]

Each previewEvent must include all original fields: id, title, date, category, source, goalId, recurring — with only startTime and endTime changed.

━━ SLEEP OPTIMIZED ━━
Goal: protect sleep quality and circadian rhythm.
- Gym/cardio events → place before 18:00 (no exercise within 3 h of sleepTime).
- Study/work/goal events → finish at least 90 min before sleepTime.
- Add a wind-down block (category: personal) 30–45 min before sleepTime if not already present.
- Prefer early morning (07:00–09:00) for workouts.

━━ PRODUCTIVITY OPTIMIZED ━━
Goal: maximise cognitive output during peak hours.
- Study/work/goal events → cluster during energyPeak window (morning = 08:00–12:00, evening = 17:00–21:00).
- Cap each block at 90 min; leave ≥15 min gap between consecutive deep-work blocks.
- Gym/cardio events → push to post-lunch dip (13:00–15:00) or evening to protect peak hours.

━━ FITNESS OPTIMIZED ━━
Goal: maximise training adaptation and consistency.
- Gym/cardio events → schedule at 06:30–08:30 (highest adherence window).
- Ensure ≥48 h between same-category gym events on consecutive days.
- Study/work/goal events → shift to mid-morning (09:00–11:00) or afternoon after workout.

RULES:
- Preserve the exact event IDs from the input (copy them character-for-character).
- Preserve title, date, category, source, goalId, recurring — only change startTime and endTime.
- Duration (endTime − startTime) must stay the same as the original.
- Do not add or remove events — each previewEvents array must have the same length as the input.
- Avoid overlapping with the imported events listed in context.`;

export async function generateRescheduleOptions(
  schedule: ScheduleState,
  profile: UserProfile | null
): Promise<SchedulingOption[]> {
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

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

  const systemPrompt = RESCHEDULE_PROMPT.replace("{PROFILE_PLACEHOLDER}", profileBullets);

  const pebbleEvents = schedule.events.filter((e) => e.source === "pebble");
  const importedEvents = schedule.events
    .filter((e) => e.source === "imported")
    .map((e) => ({ id: e.id, title: e.title, date: e.date, startTime: e.startTime, endTime: e.endTime }));

  const userContext = `Current Pebble events to reschedule:
${JSON.stringify(pebbleEvents, null, 2)}

Imported events (do not conflict with these):
${JSON.stringify(importedEvents, null, 2)}

Goals:
${JSON.stringify(schedule.goals, null, 2)}

Return the JSON array only.`;

  const result = await model.generateContent([
    { text: systemPrompt },
    { text: userContext },
  ]);

  const raw = result.response.text().trim();
  const stripped = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  const start = stripped.indexOf("[");
  if (start === -1) throw new Error("No JSON array found in reschedule response");
  return JSON.parse(stripped.slice(start)) as SchedulingOption[];
}
