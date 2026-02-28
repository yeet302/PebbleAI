import { GoogleGenerativeAI } from "@google/generative-ai";
import { ScheduleState } from "@/types";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const getSystemPrompt = () => `You are GoalkeeperAI, a personal scheduling assistant.
You manage a user's calendar events and goals. You receive the current schedule as JSON and a user instruction.
You must return ONLY a valid JSON object matching the ScheduleState schema — no markdown, no explanation.

Schema:
{
  "events": [
    {
      "id": "string (uuid)",
      "title": "string",
      "date": "YYYY-MM-DD",
      "startTime": "HH:MM",
      "endTime": "HH:MM",
      "category": "class" | "study" | "gym" | "work" | "goal" | "personal",
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
- Preserve existing event IDs when modifying events. Generate new UUIDs for new items.
- When the user adds recurring events, create individual entries for the next 4 weeks.
- When the user adds a goal, ALWAYS generate concrete calendar events that support it for the next 4 weeks. For example, a LeetCode goal should create daily "LeetCode Practice" study events; a fitness goal should create gym events; an academic goal should create study blocks.
- Prioritize goals when scheduling study/work blocks.
- Keep schedules realistic — include breaks, sleep, and meals.
- Today's date is ${new Date().toISOString().split("T")[0]}. Use this to generate dates relative to today.`;



export async function updateSchedule(
  currentState: ScheduleState,
  userInstruction: string
): Promise<ScheduleState> {
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const prompt = `Current schedule:
${JSON.stringify(currentState, null, 2)}

User instruction: ${userInstruction}

Return the updated schedule as JSON only.`;

  const result = await model.generateContent([
    { text: getSystemPrompt() },
    { text: prompt },
  ]);

  const raw = result.response.text().trim();
  // Strip markdown code fences if Gemini wraps the response
  const json = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  return JSON.parse(json) as ScheduleState;
}
