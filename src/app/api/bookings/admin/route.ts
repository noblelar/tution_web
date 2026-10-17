import { NextRequest, NextResponse } from "next/server";

import { callProtectedBackend, verifyMutationRequest } from "@/lib/server-auth";
import { protectedJsonResponse } from "@/lib/server-bff";
import { BackendSessionBooking, bookingInput, mapSessionBooking } from "@/lib/server-bookings";

export async function POST(request: NextRequest) {
  if (!verifyMutationRequest(request)) return NextResponse.json({ error: "Request verification failed." }, { status: 403 });
  const input = await bookingInput(request, true);
  if (!input) return NextResponse.json({ error: "Centre, session, subject, student, and household are required; administrators cannot write lesson focus." }, { status: 400 });
  const call = await callProtectedBackend(request, "/v1/bookings/admin", { method: "POST", body: JSON.stringify(input) });
  return protectedJsonResponse(call, (body) => mapSessionBooking(body as BackendSessionBooking), "The administrative booking could not be created.");
}

