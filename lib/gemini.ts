import { GoogleGenerativeAI } from "@google/generative-ai";
import { ScheduleState, ScheduleDiff, Message, ChatResponse, UserProfile, OptimizationMode } from "@/types";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const ONBOARDING_PROMPT = `You are Pebble, a friendly scheduling assistant. You are meeting this user for the first time and need to learn a bit about them before helping them schedule.

RESPONSE FORMAT — always return valid JSON, no markdown:
{
  "message": "what you say to the user",
  "diff": null
}

Only emit a diff when you have collected ALL required fields and are ready to save the profile:
{
  "message": "Great, I have everything I need! ...",
  "diff": {
    "setProfile": {
      "name": "...",
      "wakeTime": "HH:MM",
      "sleepTime": "HH:MM",
      "energyPeak": "morning" | "evening",
      "sessionLengthMinutes": number,
      "freeDays": ["Saturday", "Sunday"],
      "notes": "optional"
    }
  }
}

INTERVIEW RULES:
- Ask exactly ONE question at a time, in a warm and conversational tone.
- Question order: 1) name → 2) wake/sleep times → 3) energy peak (morning or evening person?) → 4) preferred session length → 5) free days
- Do NOT schedule any goals or events during onboarding — just collect info.
- Only emit "setProfile" in the diff once ALL five required fields (name, wakeTime, sleepTime, energyPeak, sessionLengthMinutes, freeDays) are collected.
- If the user sends "[REDO PREFERENCES]", treat it as a fresh start: greet them warmly and restart from question 1 (name).
- After emitting setProfile, give a brief warm summary and say you're ready to help them schedule.
- Today's date is ${new Date().toISOString().split("T")[0]}.`;

const SCHEDULING_PROMPT = `You are Pebble, a scheduling assistant that helps people find time in their busy lives for the goals and hobbies that matter to them.

USER PROFILE:
{PROFILE_PLACEHOLDER}
Active optimization mode: {MODE_PLACEHOLDER}

RESPONSE FORMAT — always return valid JSON, no markdown:
{
  "message": "what you say to the user",
  "diff": { ...only when making changes... } or null
}

Diff schema (use null if not making changes yet):
{
  "addEvents": [], "updateEvents": [], "removeEventIds": [],
  "addGoals": [], "updateGoals": [], "removeGoalIds": []
}

Event fields: id (uuid), title, date (YYYY-MM-DD), startTime (HH:MM), endTime (HH:MM),
  category ("class"|"study"|"gym"|"work"|"goal"|"personal"), source ("pebble"), description?, recurring ("daily"|"weekly"|"none"),
  goalId (string — set this to the goal's id when creating Pebbles for a goal)

Goal fields: id (uuid), title, type ("short-term"|"long-term"), description?, deadline?

CORE RULES:
- Events with source "imported" are the user's real commitments — NEVER modify, move, or delete them.
- Only schedule new events in genuinely free slots (no overlap with imported events).
- Always set source to "pebble" on any event you create.
- Respect the user's wakeTime and sleepTime — never schedule Pebbles outside those hours.
- On the user's freeDays, avoid scheduling unless they explicitly ask.
- Prefer scheduling during the user's energyPeak time of day when possible.
- Use sessionLengthMinutes as the default Pebble length unless the user specifies otherwise.
- Always address the user by name ({NAME_PLACEHOLDER}) occasionally to keep things personal.

DIFF RULES:
- addEvents: only truly NEW events in free time slots.
- updateEvents: modify existing pebble events only. Copy the existing event's ID exactly.
- removeEventIds: ONLY when the user explicitly asks to delete something.
- Leave any array empty if nothing changes in that category.

DAILY CHECK-IN:
- When the conversation starts with a check-in prompt listing incomplete Pebbles, ask the user which ones they completed in a friendly, conversational way.
- Based on their response, return a diff with updateEvents setting completed: true on the Pebbles they confirm doing.
- If they say they did all of them, mark all as complete. If they skipped some, only mark the ones they did.
- After updating, give a brief encouraging message about their progress.

BEHAVIOR:
- Your job is to help users achieve their goals by finding realistic time in their existing schedule.
- Every goal MUST have a deadline. If the user doesn't provide one, ask for it before scheduling anything.
- Once you have the goal AND deadline, immediately schedule Pebbles using the active optimization mode's rules. Include a brief coaching explanation for each Pebble's timing in your message.
- If other details are vague (frequency, duration), make a reasonable decision — don't ask more than 1 follow-up question beyond the deadline.
- Call scheduled blocks "Pebbles" — never "sessions".
- Keep responses short and conversational.
- Today's date is ${new Date().toISOString().split("T")[0]}.

OPTIMIZATION MODES:
The active optimization mode is listed in the user profile above. Apply its rules when scheduling Pebbles. For every Pebble you schedule, include a one-sentence explanation in your message of WHY that time was chosen based on the science (e.g. "I placed your workout at 7am because intense exercise within 3 hours of sleep raises core body temperature and delays sleep onset."). Keep the overall message concise — the explanations should feel like coaching tips, not a lecture.

Sleep Optimization rules:
- No intense exercise (gym/cardio) within 3 hours of sleepTime — raises core body temperature, delaying sleep onset by 30–60 min.
- No cognitively stimulating work (study, deep work) within 90 minutes of sleepTime — elevates cortisol and arousal.
- Schedule a wind-down Pebble (category: personal) 30–45 min before sleepTime — reduces sleep latency by ~37% (sleep research).
- Prefer morning slots for intense workouts — cortisol peaks naturally in the morning and exercise amplifies this helpfully.
- Consistent wakeTime is the strongest circadian anchor — never schedule anything that pushes the next day's wake time later.

Productivity Optimization rules:
- Schedule all deep work Pebbles (study/work/goal) during the user's energyPeak window — prefrontal cortex function peaks here.
- Use 90-minute blocks maximum — matches the brain's ultradian rhythm; performance drops sharply beyond 90 min without a break.
- Always leave ≥15 min between consecutive deep work Pebbles — cognitive performance degrades ~20% without micro-recovery.
- Batch low-focus tasks (admin, email) in the post-lunch dip (13:00–15:00 for most people) — protect peak hours.
- Never schedule deep work immediately after a heavy meal — glucose spike followed by drop impairs sustained attention.

Fitness Optimization rules:
- Allow 48–72 hours between strength sessions targeting the same muscle group — muscle protein synthesis requires this window.
- Morning workouts preferred — adherence rates are 25% higher for morning exercisers (habit research).
- Alternate intensity: never schedule two high-intensity sessions back-to-back; include active recovery or rest.
- Start with 3 sessions/week for new goals — progressive overload principle (increase volume before intensity).
- Schedule a post-workout Pebble window of 30 min for nutrition/cooldown if possible — protein synthesis window peaks within 30–60 min post-exercise.`;

export function buildSystemPrompt(profile: UserProfile | null, optimizationMode: OptimizationMode | null): string {
  if (profile === null) return ONBOARDING_PROMPT;

  const profileBullets = [
    `- Name: ${profile.name}`,
    `- Wake time: ${profile.wakeTime}`,
    `- Sleep time: ${profile.sleepTime}`,
    `- Energy peak: ${profile.energyPeak}`,
    `- Preferred Pebble length: ${profile.sessionLengthMinutes} minutes`,
    `- Free days: ${profile.freeDays.length > 0 ? profile.freeDays.join(", ") : "none specified"}`,
    profile.notes ? `- Notes: ${profile.notes}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  return SCHEDULING_PROMPT
    .replace("{PROFILE_PLACEHOLDER}", profileBullets)
    .replace("{NAME_PLACEHOLDER}", profile.name)
    .replace("{MODE_PLACEHOLDER}", optimizationMode ?? "fitness");
}

function buildPrompt(messages: Message[], currentState: ScheduleState): string {
  const summary = {
    goals: currentState.goals.map((g) => {
      const pebbles = currentState.events.filter((e) => e.goalId === g.id && e.source === "pebble");
      return {
        id: g.id,
        title: g.title,
        deadline: g.deadline,
        pebblesCompleted: pebbles.filter((e) => e.completed).length,
        pebblesTotal: pebbles.length,
      };
    }),
    importedEvents: currentState.events
      .filter((e) => e.source === "imported")
      .map((e) => ({ id: e.id, title: e.title, date: e.date, startTime: e.startTime, endTime: e.endTime })),
    pebbleEvents: currentState.events
      .filter((e) => e.source === "pebble")
      .map((e) => ({ id: e.id, title: e.title, date: e.date, startTime: e.startTime, endTime: e.endTime, goalId: e.goalId, completed: e.completed })),
  };

  const history = messages.map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`).join("\n");

  return `Current schedule (${currentState.events.length} events, ${currentState.goals.length} goals):
${JSON.stringify(summary)}

Conversation:
${history}

Respond with JSON only.`;
}

function applyDiff(
  current: ScheduleState,
  diff: Partial<ScheduleDiff>
): { state: ScheduleState; changedEventIds: string[]; setProfile?: UserProfile } {
  let events = [...current.events];
  let goals = [...current.goals];
  const changedEventIds: string[] = [];

  // Extract setProfile separately — validate required fields before accepting
  let setProfile: UserProfile | undefined;
  if (diff.setProfile) {
    const p = diff.setProfile;
    if (
      p.name &&
      p.wakeTime &&
      p.sleepTime &&
      p.energyPeak &&
      p.sessionLengthMinutes &&
      p.freeDays
    ) {
      setProfile = p;
    }
  }

  // Safety: ignore mass deletions (likely a model error, not user intent)
  const safeToRemove = (ids: string[], total: number) => ids.length <= Math.max(5, total * 0.3);

  if (diff.removeEventIds?.length && safeToRemove(diff.removeEventIds, events.length))
    events = events.filter((e) => !diff.removeEventIds!.includes(e.id));
  if (diff.removeGoalIds?.length)
    goals = goals.filter((g) => !diff.removeGoalIds!.includes(g.id));

  if (diff.updateEvents?.length) {
    events = events.map((e) => {
      const u = diff.updateEvents!.find((u) => u.id === e.id);
      return u ? { ...e, ...u } : e;
    });
    changedEventIds.push(...diff.updateEvents.map((u) => u.id));
  }
  if (diff.updateGoals?.length)
    goals = goals.map((g) => {
      const u = diff.updateGoals!.find((u) => u.id === g.id);
      return u ? { ...g, ...u } : g;
    });

  if (diff.addEvents?.length) {
    events = [...events, ...diff.addEvents];
    changedEventIds.push(...diff.addEvents.map((e) => e.id));
  }
  if (diff.addGoals?.length)
    goals = [...goals, ...diff.addGoals];

  return { state: { events, goals }, changedEventIds, setProfile };
}

export function parseJSON(raw: string): unknown {
  // Strip markdown fences if present
  const stripped = raw.trim().replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  // Extract the first complete JSON object (handles trailing text from the model)
  const start = stripped.indexOf("{");
  if (start === -1) throw new Error("No JSON object found in response");
  let depth = 0;
  for (let i = start; i < stripped.length; i++) {
    if (stripped[i] === "{") depth++;
    else if (stripped[i] === "}") {
      depth--;
      if (depth === 0) return JSON.parse(stripped.slice(start, i + 1));
    }
  }
  throw new Error("Malformed JSON in response");
}

export async function chat(
  messages: Message[],
  currentState: ScheduleState,
  profile: UserProfile | null,
  optimizationMode: OptimizationMode | null
): Promise<{ response: ChatResponse; updatedState: ScheduleState; changedEventIds: string[]; setProfile?: UserProfile }> {
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const result = await model.generateContent([
    { text: buildSystemPrompt(profile, optimizationMode) },
    { text: buildPrompt(messages, currentState) },
  ]);

  const parsed = parseJSON(result.response.text()) as ChatResponse;
  const { state: updatedState, changedEventIds, setProfile } = parsed.diff
    ? applyDiff(currentState, parsed.diff)
    : { state: currentState, changedEventIds: [], setProfile: undefined };

  return { response: parsed, updatedState, changedEventIds, setProfile };
}
