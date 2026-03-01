import { NextRequest, NextResponse } from "next/server";
import { chat } from "@/lib/gemini";
import { ScheduleState, Message, UserProfile, OptimizationMode } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const { messages, currentState, profile, optimizationMode } = await req.json() as {
      messages: Message[];
      currentState: ScheduleState;
      profile: UserProfile | null;
      optimizationMode: OptimizationMode | null;
    };

    if (!messages?.length) {
      return NextResponse.json({ error: "Messages are required" }, { status: 400 });
    }

    const { response, updatedState, changedEventIds, setProfile } = await chat(messages, currentState, profile ?? null, optimizationMode ?? null);
    return NextResponse.json({
      message: response.message,
      schedule: updatedState,
      changedEventIds,
      profile: setProfile ?? null,
    });
  } catch (err) {
    console.error("Schedule API error:", err);
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
}
