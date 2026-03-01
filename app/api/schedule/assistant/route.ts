import { NextRequest, NextResponse } from "next/server";
import { assistantScheduleTurn, AssistantMessage } from "@/lib/gemini";
import { ScheduleState } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const { currentState, conversation } = (await req.json()) as {
      currentState: ScheduleState;
      conversation: AssistantMessage[];
    };

    if (!Array.isArray(conversation) || conversation.length === 0) {
      return NextResponse.json({ error: "Conversation is required" }, { status: 400 });
    }

    const result = await assistantScheduleTurn(currentState, conversation);
    return NextResponse.json(result);
  } catch (err) {
    console.error("Schedule assistant API error:", err);
    return NextResponse.json({ error: "Failed to process assistant turn" }, { status: 500 });
  }
}
