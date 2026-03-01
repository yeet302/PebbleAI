import { GoogleGenerativeAI } from "@google/generative-ai";
import { ScheduleState, ScheduleDiff, Message, ChatResponse } from "@/types";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const SYSTEM_PROMPT = `You are Pebble, a scheduling assistant that helps people find time in their busy lives for the goals and hobbies that matter to them.

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
  goalId (string — set this to the goal's id when creating sessions for a goal)

Goal fields: id (uuid), title, type ("short-term"|"long-term"), description?, deadline?

CORE RULES:
- Events with source "imported" are the user's real commitments — NEVER modify, move, or delete them.
- Only schedule new events in genuinely free slots (no overlap with imported events).
- Always set source to "pebble" on any event you create.

DIFF RULES:
- addEvents: only truly NEW events in free time slots.
- updateEvents: modify existing pebble events only. Copy the existing event's ID exactly.
- removeEventIds: ONLY when the user explicitly asks to delete something.
- Leave any array empty if nothing changes in that category.

DAILY CHECK-IN:
- When the conversation starts with a check-in prompt listing incomplete sessions, ask the user which ones they completed in a friendly, conversational way.
- Based on their response, return a diff with updateEvents setting completed: true on the sessions they confirm doing.
- If they say they did all of them, mark all as complete. If they skipped some, only mark the ones they did.
- After updating, give a brief encouraging message about their progress.

BEHAVIOR:
- Your job is to help users achieve their goals by finding realistic time in their existing schedule.
- Every goal MUST have a deadline. If the user doesn't provide one, ask for it before scheduling anything.
- Once you have the goal and deadline, work backwards: figure out how many sessions are needed and spread them across the available time.
- If other details are vague (frequency, duration), make a reasonable decision — don't ask more than 1 follow-up question beyond the deadline.
- When adding a goal, add it to addGoals (with deadline set) AND schedule sessions in addEvents between today and the deadline.
- Keep responses short and conversational.
- Today's date is ${new Date().toISOString().split("T")[0]}.`;

function buildPrompt(messages: Message[], currentState: ScheduleState): string {
  const summary = {
    goals: currentState.goals.map((g) => {
      const sessions = currentState.events.filter((e) => e.goalId === g.id && e.source === "pebble");
      return {
        id: g.id,
        title: g.title,
        deadline: g.deadline,
        sessionsCompleted: sessions.filter((e) => e.completed).length,
        sessionsTotal: sessions.length,
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

function applyDiff(current: ScheduleState, diff: Partial<ScheduleDiff>): { state: ScheduleState; changedEventIds: string[] } {
  let events = [...current.events];
  let goals = [...current.goals];
  const changedEventIds: string[] = [];

  // Safety: ignore mass deletions (likely a model error, not user intent)
  const safeToRemove = (ids: string[], total: number) => ids.length <= Math.max(5, total * 0.3);

  if (diff.removeEventIds?.length && safeToRemove(diff.removeEventIds, events.length))
    events = events.filter((e) => !diff.removeEventIds!.includes(e.id));
  if (diff.removeGoalIds?.length)
    goals = goals.filter((g) => !diff.removeGoalIds!.includes(g.id));

  if (diff.updateEvents?.length) {
    events = events.map((e) => {
      const u = diff.updateEvents!.find((u) => u.id === e.id);
      return u ? { ...e, ...u } : e;  // merge so AI can send partial updates
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

  return { state: { events, goals }, changedEventIds };
}

function parseJSON(raw: string): unknown {
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
  currentState: ScheduleState
): Promise<{ response: ChatResponse; updatedState: ScheduleState; changedEventIds: string[] }> {
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const result = await model.generateContent([
    { text: SYSTEM_PROMPT },
    { text: buildPrompt(messages, currentState) },
  ]);

  const parsed = parseJSON(result.response.text()) as ChatResponse;
  const { state: updatedState, changedEventIds } = parsed.diff
    ? applyDiff(currentState, parsed.diff)
    : { state: currentState, changedEventIds: [] };

  return { response: parsed, updatedState, changedEventIds };
}
