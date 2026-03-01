import { NextRequest, NextResponse } from "next/server";
import { mapGoogleEvent } from "@/lib/google-calendar";

const CALENDAR_URL =
  "https://www.googleapis.com/calendar/v3/calendars/primary/events";

async function refreshAccessToken(refreshToken: string) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error("Token refresh failed");
  const data = await res.json();
  return {
    accessToken: data.access_token as string,
    expiry: Date.now() + (data.expires_in - 60) * 1000,
  };
}

export async function POST(req: NextRequest) {
  const { accessToken: rawAccess, refreshToken, expiry } = await req.json();

  let accessToken: string = rawAccess;
  let newAccessToken: string | undefined;
  let newExpiry: number | undefined;

  // Refresh if expired
  if (expiry && Date.now() >= expiry) {
    if (!refreshToken) {
      return NextResponse.json({ error: "Token expired, no refresh token" }, { status: 401 });
    }
    const refreshed = await refreshAccessToken(refreshToken);
    accessToken = refreshed.accessToken;
    newAccessToken = refreshed.accessToken;
    newExpiry = refreshed.expiry;
  }

  const timeMin = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const timeMax = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();

  const params = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "500",
  });

  const calRes = await fetch(`${CALENDAR_URL}?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (calRes.status === 401) {
    if (!refreshToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // Token may have been invalid; try a refresh
    try {
      const refreshed = await refreshAccessToken(refreshToken);
      accessToken = refreshed.accessToken;
      newAccessToken = refreshed.accessToken;
      newExpiry = refreshed.expiry;

      const retryRes = await fetch(`${CALENDAR_URL}?${params}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!retryRes.ok) {
        return NextResponse.json({ error: "Calendar fetch failed after refresh" }, { status: 502 });
      }
      const retryData = await retryRes.json();
      const events = (retryData.items ?? []).map(mapGoogleEvent);
      return NextResponse.json({ events, newAccessToken, newExpiry });
    } catch {
      return NextResponse.json({ error: "Token refresh failed" }, { status: 401 });
    }
  }

  if (!calRes.ok) {
    return NextResponse.json({ error: "Calendar fetch failed" }, { status: 502 });
  }

  const data = await calRes.json();
  const events = (data.items ?? []).map(mapGoogleEvent);

  return NextResponse.json({ events, newAccessToken, newExpiry });
}
