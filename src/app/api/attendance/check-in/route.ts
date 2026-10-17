import { NextRequest, NextResponse } from "next/server";

import { callProtectedBackend, verifyMutationRequest } from "@/lib/server-auth";
import { protectedJsonResponse } from "@/lib/server-bff";
import {
  type BackendCheckInContext,
  type BackendCheckInResult,
  mapCheckInContext,
  mapCheckInResult,
} from "@/lib/server-attendance";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token")?.trim() ?? "";
  const call = await callProtectedBackend(request, `/v1/attendance/check-in?token=${encodeURIComponent(token)}`, { method: "GET" });
  return protectedJsonResponse(call, (body) => mapCheckInContext(body as BackendCheckInContext), "The check-in code could not be loaded.");
}

export async function POST(request: NextRequest) {
  if (!verifyMutationRequest(request)) return NextResponse.json({ error: "Request verification failed." }, { status: 403 });
  let value: Record<string, unknown>;
  try { value = (await request.json()) as Record<string, unknown>; }
  catch { return NextResponse.json({ error: "Check-in details are invalid." }, { status: 400 }); }
  const token = typeof value.token === "string" ? value.token.trim() : "";
  const bookingIds = Array.isArray(value.bookingIds) ? value.bookingIds.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean) : [];
  if (!token || !bookingIds.length) return NextResponse.json({ error: "Select at least one student to check in." }, { status: 400 });
  const call = await callProtectedBackend(request, "/v1/attendance/check-in", { method: "POST", body: JSON.stringify({ token, booking_ids: bookingIds }) });
  return protectedJsonResponse(call, (body) => mapCheckInResult(body as BackendCheckInResult), "Students could not be checked in.");
}

