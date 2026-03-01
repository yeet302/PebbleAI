import { NextRequest, NextResponse } from "next/server";
import { scoreSchedule } from "@/lib/scoring";
import { ScheduleState, UserProfile } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const { schedule, profile } = await req.json() as {
      schedule: ScheduleState;
      profile: UserProfile | null;
    };

    const weekScore = await scoreSchedule(schedule, profile ?? null);
    return NextResponse.json(weekScore);
  } catch (err) {
    console.error("Score API error:", err);
    return NextResponse.json({ error: "Failed to score schedule" }, { status: 500 });
  }
}
