import { NextRequest, NextResponse } from "next/server";
import { generateRescheduleOptions } from "@/lib/reschedule";
import { ScheduleState, UserProfile, OptimizationMode } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const { schedule, profile, mode } = await req.json() as {
      schedule: ScheduleState;
      profile: UserProfile | null;
      mode: OptimizationMode;
    };

    const options = await generateRescheduleOptions(schedule, profile, mode);
    return NextResponse.json(options);
  } catch (err) {
    console.error("Reschedule API error:", err);
    return NextResponse.json({ error: "Failed to generate reschedule options" }, { status: 500 });
  }
}
