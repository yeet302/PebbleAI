import { NextRequest, NextResponse } from "next/server";
import { updateSchedule } from "@/lib/gemini";
import { ScheduleState } from "@/types";
import { readScheduleDb, writeScheduleDb } from "@/lib/schedule-db";

export async function GET() {
  try {
    const state = await readScheduleDb();
    return NextResponse.json(state);
  } catch (err) {
    console.error("Schedule GET API error:", err);
    return NextResponse.json({ error: "Failed to load schedule" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { currentState, instruction } = await req.json() as {
      currentState: ScheduleState;
      instruction: string;
    };

    if (!instruction?.trim()) {
      return NextResponse.json({ error: "Instruction is required" }, { status: 400 });
    }

    const dbState = await readScheduleDb();
    const baseState =
      dbState.events.length > 0 || dbState.goals.length > 0 ? dbState : currentState;

    const updatedState = await updateSchedule(baseState, instruction);
    await writeScheduleDb(updatedState);
    return NextResponse.json(updatedState);
  } catch (err) {
    console.error("Schedule API error:", err);
    return NextResponse.json({ error: "Failed to update schedule" }, { status: 500 });
  }
}
