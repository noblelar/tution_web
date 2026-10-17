import { NextRequest, NextResponse } from "next/server";

import { callProtectedBackend, verifyMutationRequest } from "@/lib/server-auth";
import { protectedJsonResponse } from "@/lib/server-bff";
import { BackendSessionBooking, mapSessionBooking } from "@/lib/server-bookings";

type RouteContext = { params: Promise<{ bookingID: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  if (!verifyMutationRequest(request)) return NextResponse.json({ error: "Request verification failed." }, { status: 403 });
  let input: Record<string, unknown> = {};
  try { input = (await request.json()) as Record<string, unknown>; } catch { /* optional body */ }
  const operation = request.nextUrl.searchParams.get("operation") === "confirm" ? "confirm" : "cancel";
  const centreId = typeof input.centreId === "string" ? input.centreId.trim() : "";
  const reason = typeof input.reason === "string" ? input.reason.trim() : "";
  const { bookingID } = await context.params;
  const call = await callProtectedBackend(request, `/v1/bookings/${encodeURIComponent(bookingID)}/${operation}`, { method: "POST", body: JSON.stringify({ centre_id: centreId || undefined, reason: reason || undefined }) });
  return protectedJsonResponse(call, (body) => mapSessionBooking(body as BackendSessionBooking), operation === "confirm" ? "The waiting booking could not be confirmed." : "The booking could not be cancelled.");
}

