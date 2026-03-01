import { GoogleGenerativeAI } from "@google/generative-ai";
import { ScheduleState, UserProfile, WeekScore } from "@/types";
import { parseJSON } from "@/lib/gemini";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const SCORING_PROMPT = `You are a scientific schedule analyst. Analyze the user's upcoming week and score it across 4 dimensions using evidence-based benchmarks. Be honest but constructive.

RESPONSE FORMAT — return valid JSON only, no markdown:
{
  "overall": <0-100>,
  "summary": "<2-3 sentence overall assessment>",
  "categories": [
    { "name": "Physical Health",   "score": <0-100>, "insight": "<1-2 sentences>", "tip": "<1 actionable tip>" },
    { "name": "Sleep Hygiene",     "score": <0-100>, "insight": "<1-2 sentences>", "tip": "<1 actionable tip>" },
    { "name": "Productivity",      "score": <0-100>, "insight": "<1-2 sentences>", "tip": "<1 actionable tip>" },
    { "name": "Work-Life Balance", "score": <0-100>, "insight": "<1-2 sentences>", "tip": "<1 actionable tip>" }
  ]
}

SCORING BENCHMARKS:

Physical Health (WHO guidelines):
- Target: 150 min/week moderate aerobic activity (gym, exercise, sport events)
- 0 minutes = 10, 30 min = 30, 75 min = 60, 120 min = 80, 150+ min = 90-100
- Bonus points for spreading activity across multiple days vs. cramming into one

Sleep Hygiene (sleep science):
- Calculate nightly hours from wakeTime and sleepTime in the user profile
- 7–9 hours = 90–100 (optimal), 6–7 hours = 65–80 (acceptable), 9–10 hours = 70–80
- Under 6 hours = 20–50, under 5 hours = 10–30
- If no profile is provided, score based on the presence of late-night vs. early-morning events
- Consistent schedule = higher score

Productivity (cognitive science research):
- Count study + work + goal-category event blocks in the upcoming week
- Target: 3–5 hours of focused deep work per active workday (Mon–Fri)
- Score based on: frequency of blocks, alignment with user's energyPeak, and whether blocks are reasonable length (45–120 min ideal)
- No work blocks at all = 10–20; occasional blocks = 40–60; consistent daily blocks aligned with energy peak = 80–100

Work-Life Balance (occupational health research):
- Ideal ratio: ~50% structured commitments (work/study/class), ~50% restorative time (personal/goal/free)
- 100% work with no personal time = 10–20
- Mostly personal with no productivity = 40–60
- Well-mixed ~50/50 = 80–100
- Also consider: presence of free days, whether schedule respects the user's freeDays preference

Today's date is ${new Date().toISOString().split("T")[0]}.`;

function buildScoringContext(schedule: ScheduleState, profile: UserProfile | null): string {
  const today = new Date().toISOString().split("T")[0];
  const weekEnd = new Date();
  weekEnd.setDate(weekEnd.getDate() + 7);
  const weekEndStr = weekEnd.toISOString().split("T")[0];

  const upcomingEvents = schedule.events.filter(
    (e) => e.date >= today && e.date <= weekEndStr
  );

  const eventSummary = upcomingEvents.map((e) => ({
    title: e.title,
    date: e.date,
    startTime: e.startTime,
    endTime: e.endTime,
    category: e.category,
    source: e.source,
  }));

  const profileSection = profile
    ? `User profile:
- Wake time: ${profile.wakeTime}
- Sleep time: ${profile.sleepTime}
- Energy peak: ${profile.energyPeak}
- Free days: ${profile.freeDays.length > 0 ? profile.freeDays.join(", ") : "none specified"}
- Preferred Pebble length: ${profile.sessionLengthMinutes} minutes`
    : "User profile: not available";

  return `${profileSection}

Upcoming week events (${today} to ${weekEndStr}, ${upcomingEvents.length} total):
${JSON.stringify(eventSummary, null, 2)}

Score this week across all 4 dimensions. Respond with JSON only.`;
}

export async function scoreSchedule(schedule: ScheduleState, profile: UserProfile | null): Promise<WeekScore> {
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const result = await model.generateContent([
    { text: SCORING_PROMPT },
    { text: buildScoringContext(schedule, profile) },
  ]);

  return parseJSON(result.response.text()) as WeekScore;
}
