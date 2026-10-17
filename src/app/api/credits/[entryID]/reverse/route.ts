import { NextRequest, NextResponse } from "next/server";

import { callProtectedBackend, verifyMutationRequest } from "@/lib/server-auth";
import { protectedJsonResponse } from "@/lib/server-bff";
import { BackendCreditMutationResult, mapCreditMutation } from "@/lib/server-credits";

type RouteContext = { params: Promise<{ entryID: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  if (!verifyMutationRequest(request)) return NextResponse.json({ error: "Request verification failed." }, { status: 403 });
  let centreId = "";
  let reason = "";
  try {
    const input = (await request.json()) as { centreId?: unknown; reason?: unknown };
    centreId = typeof input.centreId === "string" ? input.centreId.trim() : "";
    reason = typeof input.reason === "string" ? input.reason.trim() : "";
  } catch { /* validated below */ }
  if (!centreId || !reason) return NextResponse.json({ error: "Centre and reversal reason are required." }, { status: 400 });
  const { entryID } = await context.params;
  const call = await callProtectedBackend(request, `/v1/credits/entries/${encodeURIComponent(entryID)}/reverse`, { method: "POST", body: JSON.stringify({ centre_id: centreId, reason }) });
  return protectedJsonResponse(call, (body) => mapCreditMutation(body as BackendCreditMutationResult), "The credit award could not be reversed.");
}
