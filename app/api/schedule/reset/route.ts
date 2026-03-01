import { NextResponse } from "next/server";
import { resetScheduleDb } from "@/lib/schedule-db";

export async function POST() {
  try {
    await resetScheduleDb();
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Schedule reset API error:", err);
    return NextResponse.json({ error: "Failed to reset schedule" }, { status: 500 });
  }
}

