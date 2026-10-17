import { NextRequest, NextResponse } from "next/server";

import { callProtectedBackend, verifyMutationRequest } from "@/lib/server-auth";
import { protectedJsonResponse } from "@/lib/server-bff";
import { BackendBookingContext, BackendSessionBooking, bookingInput, mapBookingContext, mapSessionBooking } from "@/lib/server-bookings";

export async function GET(request: NextRequest) {
  const centreId = request.nextUrl.searchParams.get("centreId")?.trim();
  const query = centreId ? `?centre_id=${encodeURIComponent(centreId)}` : "";
  const call = await callProtectedBackend(request, `/v1/bookings${query}`, { method: "GET" });
  return protectedJsonResponse(call, (body) => mapBookingContext(body as BackendBookingContext), "Bookings could not be loaded.");
}

export async function POST(request: NextRequest) {
  if (!verifyMutationRequest(request)) return NextResponse.json({ error: "Request verification failed." }, { status: 403 });
  const input = await bookingInput(request, false);
  if (!input) return NextResponse.json({ error: "Session, subject, student, and household are required." }, { status: 400 });
  const call = await callProtectedBackend(request, "/v1/bookings", { method: "POST", body: JSON.stringify(input) });
  return protectedJsonResponse(call, (body) => mapSessionBooking(body as BackendSessionBooking), "The booking could not be created.");
}

