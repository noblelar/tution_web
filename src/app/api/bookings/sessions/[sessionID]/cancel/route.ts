import { NextRequest, NextResponse } from "next/server";

import { callProtectedBackend, verifyMutationRequest } from "@/lib/server-auth";
import { protectedJsonResponse } from "@/lib/server-bff";
import { BackendSessionCancellationResult, mapSessionCancellation } from "@/lib/server-bookings";

type RouteContext = { params: Promise<{ sessionID: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  if (!verifyMutationRequest(request)) return NextResponse.json({ error: "Request verification failed." }, { status: 403 });
  let centreId = "";
  let reason = "";
  try {
    const input = (await request.json()) as Record<string, unknown>;
    centreId = typeof input.centreId === "string" ? input.centreId.trim() : "";
    reason = typeof input.reason === "string" ? input.reason.trim() : "";
  } catch { /* validated below */ }
  if (!centreId || !reason) return NextResponse.json({ error: "Centre and cancellation reason are required." }, { status: 400 });
  const { sessionID } = await context.params;
  const call = await callProtectedBackend(request, `/v1/bookings/sessions/${encodeURIComponent(sessionID)}/cancel`, { method: "POST", body: JSON.stringify({ centre_id: centreId, reason }) });
  return protectedJsonResponse(call, (body) => mapSessionCancellation(body as BackendSessionCancellationResult), "The session could not be cancelled.");
}
