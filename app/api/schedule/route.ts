import { NextRequest, NextResponse } from "next/server";
import { chat } from "@/lib/gemini";
import { ScheduleState, Message } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const { messages, currentState } = await req.json() as {
      messages: Message[];
      currentState: ScheduleState;
    };

    if (!messages?.length) {
      return NextResponse.json({ error: "Messages are required" }, { status: 400 });
    }

    const { response, updatedState } = await chat(messages, currentState);
    return NextResponse.json({ message: response.message, schedule: updatedState });
  } catch (err) {
    console.error("Schedule API error:", err);
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
}
