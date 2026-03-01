import { NextRequest, NextResponse } from "next/server";
import { generateRescheduleOptions } from "@/lib/reschedule";
import { ScheduleState, UserProfile } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const { schedule, profile } = await req.json() as {
      schedule: ScheduleState;
      profile: UserProfile | null;
    };

    const options = await generateRescheduleOptions(schedule, profile);
    return NextResponse.json(options);
  } catch (err) {
    console.error("Reschedule API error:", err);
    return NextResponse.json({ error: "Failed to generate reschedule options" }, { status: 500 });
  }
}
