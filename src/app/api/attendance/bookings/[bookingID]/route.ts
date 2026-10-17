import { NextRequest, NextResponse } from "next/server";

import { callProtectedBackend, verifyMutationRequest } from "@/lib/server-auth";
import { protectedJsonResponse } from "@/lib/server-bff";
import { type BackendAttendanceRecord, mapAttendance } from "@/lib/server-attendance";

type RouteContext = { params: Promise<{ bookingID: string }> };

export async function PUT(request: NextRequest, context: RouteContext) {
  if (!verifyMutationRequest(request)) return NextResponse.json({ error: "Request verification failed." }, { status: 403 });
  let value: Record<string, unknown>;
  try { value = (await request.json()) as Record<string, unknown>; }
  catch { return NextResponse.json({ error: "Attendance details are invalid." }, { status: 400 }); }
  const centreId = typeof value.centreId === "string" ? value.centreId.trim() : "";
  const status = typeof value.status === "string" ? value.status.trim() : "";
  if (!centreId || !["present", "late", "absent", "excused"].includes(status)) return NextResponse.json({ error: "Centre and attendance status are required." }, { status: 400 });
  const { bookingID } = await context.params;
  const call = await callProtectedBackend(request, `/v1/attendance/bookings/${encodeURIComponent(bookingID)}`, { method: "PUT", body: JSON.stringify({ centre_id: centreId, status }) });
  return protectedJsonResponse(call, (body) => mapAttendance(body as BackendAttendanceRecord), "Attendance could not be updated.");
}

