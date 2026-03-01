import { GoogleGenerativeAI } from "@google/generative-ai";
import { ScheduleState, ScheduleDiff, Message, ChatResponse } from "@/types";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const SYSTEM_PROMPT = `You are GoalKeeper, a personal scheduling assistant having a conversation with the user.
Your job is to understand what the user wants before making schedule changes.

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
  category ("class"|"study"|"gym"|"work"|"goal"|"personal"), description?, recurring ("daily"|"weekly"|"none")

Goal fields: id (uuid), title, type ("short-term"|"long-term"), description?, deadline?

DIFF RULES — follow these strictly:
- addEvents: only truly NEW events that don't exist yet.
- updateEvents: use this to change an existing event's time, title, or duration. Copy the existing event's ID exactly.
- removeEventIds: ONLY use when the user explicitly asks to delete or cancel something. Never remove events just to replace them — use updateEvents instead.
- Leave any array empty if nothing in that category changes.

BEHAVIOR:
- If the request is vague (e.g. "I want to get fit", "help me study more"), ask ONE focused clarifying question about timing, frequency, or duration.
- If the request is specific enough, make the change immediately and confirm with a friendly message.
- Never ask more than 2 clarifying questions before committing — after 2, make a reasonable decision and go.
- When adding a goal, always add it to addGoals AND create supporting calendar events in addEvents for the next 3 months.
- Keep responses short and conversational.
- Today's date is ${new Date().toISOString().split("T")[0]}.`;

function buildPrompt(messages: Message[], currentState: ScheduleState): string {
  const summary = {
    goals: currentState.goals.map((g) => ({ id: g.id, title: g.title })),
    events: currentState.events.map((e) => ({ id: e.id, title: e.title, date: e.date, startTime: e.startTime, endTime: e.endTime })),
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
    events = events.map((e) => diff.updateEvents!.find((u) => u.id === e.id) ?? e);
    changedEventIds.push(...diff.updateEvents.map((u) => u.id));
  }
  if (diff.updateGoals?.length)
    goals = goals.map((g) => diff.updateGoals!.find((u) => u.id === g.id) ?? g);

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
