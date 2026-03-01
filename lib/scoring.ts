import { GoogleGenerativeAI } from "@google/generative-ai";
import { ScheduleState, UserProfile, WeekScore } from "@/types";
import { parseJSON } from "@/lib/gemini";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const SCORING_PROMPT = `You are a fitness and wellness coach AI. Analyze the user's upcoming week and score it across 5 pillars of holistic health performance. Be evidence-based, honest, and motivating.

RESPONSE FORMAT — return valid JSON only, no markdown:
{
  "overall": <0-100>,
  "summary": "<2-3 sentences from a fitness coach perspective — motivating but honest>",
  "categories": [
    { "name": "Sleep",                 "score": <0-100>, "insight": "<1-2 sentences>", "tip": "<1 short actionable tip>" },
    { "name": "Recovery",              "score": <0-100>, "insight": "<1-2 sentences>", "tip": "<1 short actionable tip>" },
    { "name": "Fitness",               "score": <0-100>, "insight": "<1-2 sentences>", "tip": "<1 short actionable tip>" },
    { "name": "Cognitive Performance", "score": <0-100>, "insight": "<1-2 sentences>", "tip": "<1 short actionable tip>" },
    { "name": "Social Time",           "score": <0-100>, "insight": "<1-2 sentences>", "tip": "<1 short actionable tip>" }
  ]
}

SCORING PILLARS:

Sleep:
- Calculate nightly hours from the user's wakeTime and sleepTime (profile).
- 7–9 hours = 90–100 (optimal per NSF/AASM guidelines)
- 6–7 hours or 9–10 hours = 65–80
- Under 6 hours = 20–55; under 5 hours = 10–30
- Bonus: consistent wake/sleep times across days = stronger circadian rhythm
- If no profile, infer from early-morning vs. late-night event distribution

Recovery (Meals + Breaks + Rhythm):
- Meals: Score higher if the schedule has clear gaps at typical meal times (7–9am, 12–1pm, 6–8pm). Back-to-back events through lunch/dinner = penalty.
- Breaks: Score higher if work/study/class blocks are separated by ≥15 min rest gaps. Research: continuous focus beyond 90 min degrades performance sharply.
- Rhythm: Score higher if the daily structure is consistent — similar events at similar times across days (circadian entrainment).
- 0 visible breaks or meals = 10–25; reasonable break patterns = 55–75; clear meal windows + regular breaks + consistent daily rhythm = 80–100

Fitness:
- WHO guidelines: 150 min/week moderate aerobic OR 75 min vigorous, PLUS strength training ≥2 days/week.
- Count gym/exercise/sport events (category: "gym" or fitness-related titles).
- 0 min = 10; 30–60 min = 25–45; 75–120 min = 55–70; 150 min+ = 80–95; 150 min+ spread across 3+ days + strength = 95–100
- Frequency matters: 5× 30-min sessions beats 1× 150-min session

Cognitive Performance:
- Optimal deep work: 3–5 hours of focused blocks per workday, each 45–90 min with breaks between (Pomodoro / Ultradian research).
- Score higher if study/work blocks align with user's energyPeak (morning or evening).
- Score lower if blocks are back-to-back without rest, or spread too thin (<1 hr/day total).
- No cognitive blocks = 20; irregular or misaligned blocks = 40–60; well-spaced blocks aligned with energy peak = 75–100

Social Time:
- Gallup & positive psychology research: humans need meaningful social contact for wellbeing. ~2–4 hrs/day of social interaction is associated with peak happiness.
- Look for personal/social events, group activities, anything non-work and non-solo.
- Zero social events all week = 10–20
- 1–2 social events = 40–60
- 3–5 social events or events spread across multiple days = 65–80
- Regular daily social touchpoints = 85–100

Overall: weighted average — Sleep 25%, Recovery 20%, Fitness 25%, Cognitive Performance 15%, Social Time 15%.

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
- Free days: ${profile.freeDays.length > 0 ? profile.freeDays.join(", ") : "none specified"}`
    : "User profile: not available (assume 7:00 wake, 23:00 sleep, morning energy peak)";

  return `${profileSection}

Upcoming week events (${today} to ${weekEndStr}, ${upcomingEvents.length} total):
${JSON.stringify(eventSummary, null, 2)}

Score this week across all 5 pillars. Respond with JSON only.`;
}

export async function scoreSchedule(schedule: ScheduleState, profile: UserProfile | null): Promise<WeekScore> {
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const result = await model.generateContent([
    { text: SCORING_PROMPT },
    { text: buildScoringContext(schedule, profile) },
  ]);

  return parseJSON(result.response.text()) as WeekScore;
}
