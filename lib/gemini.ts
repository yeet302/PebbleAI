import { GoogleGenerativeAI } from "@google/generative-ai";
import { ScheduleState } from "@/types";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const getSystemPrompt = () => `You are GoalkeeperAI, a personal scheduling assistant.
You manage a user's calendar events and goals. You receive the current schedule as JSON and a user instruction.
You must return ONLY a valid JSON object matching the ScheduleState schema - no markdown, no explanation.

Schema:
{
  "events": [
    {
      "id": "string (uuid)",
      "title": "string",
      "date": "YYYY-MM-DD",
      "startTime": "HH:MM",
      "endTime": "HH:MM",
      "category": "class" | "study" | "gym" | "work" | "goal" | "personal" | "sleep" | "meal" | "break",
      "description": "string (optional)",
      "recurring": "daily" | "weekly" | "none"
    }
  ],
  "goals": [
    {
      "id": "string (uuid)",
      "title": "string",
      "type": "short-term" | "long-term",
      "description": "string (optional)",
      "deadline": "YYYY-MM-DD (optional)"
    }
  ]
}

Rules:
- Apply the instruction exactly: add, update, move, or delete events/goals as requested.
- Keep all unrelated events/goals unchanged.
- Preserve existing event IDs when modifying events. Generate new UUIDs for new items.
- When the user adds recurring events, create individual entries for the next 4 weeks.
- When the user adds a goal, always generate concrete calendar events that support it for the next 4 weeks.
- Use category "sleep" for sleep/rest, "meal" for breakfast/lunch/dinner, and "break" for short recovery blocks.
- Prioritize goals when scheduling study/work blocks.
- Keep schedules realistic - include breaks, sleep, and meals.
- Today's date is ${new Date().toISOString().split("T")[0]}. Use this to generate dates relative to today.`;

export async function updateSchedule(
  currentState: ScheduleState,
  userInstruction: string
): Promise<ScheduleState> {
  const modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const model = genAI.getGenerativeModel({ model: modelName });

  const prompt = `Current schedule:
${JSON.stringify(currentState, null, 2)}

User instruction: ${userInstruction}

Return the updated schedule as JSON only.`;

  const result = await model.generateContent([
    { text: getSystemPrompt() },
    { text: prompt },
  ]);

  const raw = result.response.text().trim();
  const json = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  return JSON.parse(json) as ScheduleState;
}

export interface AssistantMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AssistantTurnResult {
  assistantMessage: string;
  needsMoreInfo: boolean;
  updatedSchedule: ScheduleState | null;
}

const getAssistantSystemPrompt = () => `You are GoalkeeperAI, a scheduling chat assistant.
You are collecting event details and helping the user build a valid schedule.
When information is missing, ask a concise follow-up question.
When enough information is present, update the schedule and return it.

Required fields for new events unless user intent clearly says one-time minimal event:
- event name
- duration
- frequency/regularity (once, daily, weekly, specific weekdays)
- time (start time or range)
- start date
- end date (or explicitly one-time)

If any required field is missing, set needsMoreInfo=true and ask exactly one clear question.
If enough info is provided, set needsMoreInfo=false and return an updatedSchedule object.

You must return ONLY JSON with this schema:
{
  "assistantMessage": "string",
  "needsMoreInfo": true | false,
  "updatedSchedule": ScheduleState | null
}

ScheduleState schema:
{
  "events": [
    {
      "id": "string (uuid)",
      "title": "string",
      "date": "YYYY-MM-DD",
      "startTime": "HH:MM",
      "endTime": "HH:MM",
      "category": "class" | "study" | "gym" | "work" | "goal" | "personal" | "sleep" | "meal" | "break",
      "description": "string (optional)",
      "recurring": "daily" | "weekly" | "none"
    }
  ],
  "goals": [
    {
      "id": "string (uuid)",
      "title": "string",
      "type": "short-term" | "long-term",
      "description": "string (optional)",
      "deadline": "YYYY-MM-DD (optional)"
    }
  ]
}

Rules:
- Keep unrelated events/goals unchanged.
- Preserve existing IDs when modifying existing events.
- For recurring user requests, expand into concrete entries for the next 4 weeks.
- Today's date is ${new Date().toISOString().split("T")[0]}.`;

export async function assistantScheduleTurn(
  currentState: ScheduleState,
  conversation: AssistantMessage[]
): Promise<AssistantTurnResult> {
  const modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const model = genAI.getGenerativeModel({ model: modelName });

  const prompt = `Current schedule:
${JSON.stringify(currentState, null, 2)}

Conversation:
${JSON.stringify(conversation, null, 2)}

Return JSON only.`;

  const result = await model.generateContent([
    { text: getAssistantSystemPrompt() },
    { text: prompt },
  ]);

  const raw = result.response.text().trim();
  const json = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  const parsed = JSON.parse(json) as AssistantTurnResult;

  return {
    assistantMessage: parsed.assistantMessage || "Please provide a bit more detail.",
    needsMoreInfo: Boolean(parsed.needsMoreInfo),
    updatedSchedule: parsed.updatedSchedule ?? null,
  };
}
