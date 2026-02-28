import { NextRequest, NextResponse } from "next/server";
import { updateSchedule } from "@/lib/gemini";
import { ScheduleState } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const { currentState, instruction } = await req.json() as {
      currentState: ScheduleState;
      instruction: string;
    };

    if (!instruction?.trim()) {
      return NextResponse.json({ error: "Instruction is required" }, { status: 400 });
    }

    const updatedState = await updateSchedule(currentState, instruction);
    return NextResponse.json(updatedState);
  } catch (err) {
    console.error("Schedule API error:", err);
    return NextResponse.json({ error: "Failed to update schedule" }, { status: 500 });
  }
}
