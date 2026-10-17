import { NextRequest, NextResponse } from "next/server";

import { callProtectedBackend, verifyMutationRequest } from "@/lib/server-auth";
import { protectedJsonResponse } from "@/lib/server-bff";
import { type BackendAttendanceQrToken, mapQrToken } from "@/lib/server-attendance";

export async function POST(request: NextRequest) {
  if (!verifyMutationRequest(request)) return NextResponse.json({ error: "Request verification failed." }, { status: 403 });
  let value: Record<string, unknown>;
  try { value = (await request.json()) as Record<string, unknown>; }
  catch { return NextResponse.json({ error: "Session and centre are required." }, { status: 400 }); }
  const centreId = typeof value.centreId === "string" ? value.centreId.trim() : "";
  const sessionId = typeof value.sessionId === "string" ? value.sessionId.trim() : "";
  if (!centreId || !sessionId) return NextResponse.json({ error: "Session and centre are required." }, { status: 400 });
  const call = await callProtectedBackend(request, "/v1/attendance/qr", { method: "POST", body: JSON.stringify({ centre_id: centreId, session_id: sessionId }) });
  return protectedJsonResponse(call, (body) => mapQrToken(body as BackendAttendanceQrToken), "The check-in code could not be generated.");
}

