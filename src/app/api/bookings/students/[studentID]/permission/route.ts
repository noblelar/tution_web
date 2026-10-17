import { NextRequest, NextResponse } from "next/server";

import { callProtectedBackend, verifyMutationRequest } from "@/lib/server-auth";
import { protectedJsonResponse } from "@/lib/server-bff";
import { BackendStudentBookingPermission, mapStudentBookingPermission } from "@/lib/server-bookings";

type RouteContext = { params: Promise<{ studentID: string }> };

export async function PUT(request: NextRequest, context: RouteContext) {
  if (!verifyMutationRequest(request)) return NextResponse.json({ error: "Request verification failed." }, { status: 403 });
  let centreId = "";
  let canManageOwnBookings: boolean | undefined;
  try {
    const input = (await request.json()) as Record<string, unknown>;
    centreId = typeof input.centreId === "string" ? input.centreId.trim() : "";
    if (typeof input.canManageOwnBookings === "boolean") canManageOwnBookings = input.canManageOwnBookings;
  } catch { /* validated below */ }
  if (!centreId || canManageOwnBookings === undefined) return NextResponse.json({ error: "Centre and booking permission are required." }, { status: 400 });
  const { studentID } = await context.params;
  const call = await callProtectedBackend(request, `/v1/bookings/students/${encodeURIComponent(studentID)}/permission`, { method: "PUT", body: JSON.stringify({ centre_id: centreId, can_manage_own_bookings: canManageOwnBookings }) });
  return protectedJsonResponse(call, (body) => mapStudentBookingPermission(body as BackendStudentBookingPermission), "The student booking permission could not be updated.");
}

