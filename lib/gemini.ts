import { GoogleGenerativeAI } from "@google/generative-ai";
import { ScheduleState, ScheduleDiff, Message, ChatResponse } from "@/types";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const SYSTEM_PROMPT = `You are GoalkeeperAI, a personal scheduling assistant having a conversation with the user.
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

BEHAVIOR:
- If the request is vague (e.g. "I want to get fit", "help me study more"), ask ONE focused clarifying question about timing, frequency, or duration.
- If the request is specific enough, make the change immediately and confirm with a friendly message.
- Never ask more than 2 clarifying questions before committing — after 2, make a reasonable decision and go.
- When adding a goal, always add it to addGoals AND create supporting calendar events in addEvents for the next 4 weeks.
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

function applyDiff(current: ScheduleState, diff: Partial<ScheduleDiff>): ScheduleState {
  let events = [...current.events];
  let goals = [...current.goals];

  if (diff.removeEventIds?.length)
    events = events.filter((e) => !diff.removeEventIds!.includes(e.id));
  if (diff.removeGoalIds?.length)
    goals = goals.filter((g) => !diff.removeGoalIds!.includes(g.id));

  if (diff.updateEvents?.length)
    events = events.map((e) => diff.updateEvents!.find((u) => u.id === e.id) ?? e);
  if (diff.updateGoals?.length)
    goals = goals.map((g) => diff.updateGoals!.find((u) => u.id === g.id) ?? g);

  if (diff.addEvents?.length)
    events = [...events, ...diff.addEvents];
  if (diff.addGoals?.length)
    goals = [...goals, ...diff.addGoals];

  return { events, goals };
}

function parseJSON(raw: string): unknown {
  const cleaned = raw.trim().replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  return JSON.parse(cleaned);
}

export async function chat(
  messages: Message[],
  currentState: ScheduleState
): Promise<{ response: ChatResponse; updatedState: ScheduleState }> {
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const result = await model.generateContent([
    { text: SYSTEM_PROMPT },
    { text: buildPrompt(messages, currentState) },
  ]);

  const parsed = parseJSON(result.response.text()) as ChatResponse;
  const updatedState = parsed.diff ? applyDiff(currentState, parsed.diff) : currentState;

  return { response: parsed, updatedState };
}
