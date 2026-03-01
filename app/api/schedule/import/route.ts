import { NextRequest, NextResponse } from "next/server";
import { ScheduleState } from "@/types";
import { writeScheduleDb } from "@/lib/schedule-db";

export async function POST(req: NextRequest) {
  try {
    const { schedule } = (await req.json()) as { schedule: ScheduleState };
    if (!schedule || !Array.isArray(schedule.events) || !Array.isArray(schedule.goals)) {
      return NextResponse.json({ error: "Invalid schedule payload" }, { status: 400 });
    }

    await writeScheduleDb(schedule);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Schedule import API error:", err);
    return NextResponse.json({ error: "Failed to import schedule" }, { status: 500 });
  }
}

