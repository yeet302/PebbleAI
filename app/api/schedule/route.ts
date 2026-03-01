import { NextRequest, NextResponse } from "next/server";
import { chat } from "@/lib/gemini";
import { ScheduleState, Message, UserProfile } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const { messages, currentState, profile } = await req.json() as {
      messages: Message[];
      currentState: ScheduleState;
      profile: UserProfile | null;
    };

    if (!messages?.length) {
      return NextResponse.json({ error: "Messages are required" }, { status: 400 });
    }

    const { response, updatedState, changedEventIds, setProfile, schedulingOptions } = await chat(messages, currentState, profile ?? null);
    return NextResponse.json({
      message: response.message,
      schedule: updatedState,
      changedEventIds,
      profile: setProfile ?? null,
      schedulingOptions: schedulingOptions ?? null,
    });
  } catch (err) {
    console.error("Schedule API error:", err);
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
}
