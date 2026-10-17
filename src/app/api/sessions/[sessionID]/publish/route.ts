import { NextRequest, NextResponse } from "next/server";

import { callProtectedBackend, verifyMutationRequest } from "@/lib/server-auth";
import { protectedJsonResponse } from "@/lib/server-bff";
import { BackendSession, mapSession } from "@/lib/server-sessions";

type RouteContext = { params: Promise<{ sessionID: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  if (!verifyMutationRequest(request)) return NextResponse.json({ error: "Request verification failed." }, { status: 403 });
  let centreId = "";
  try { const body = (await request.json()) as { centreId?: unknown }; centreId = typeof body.centreId === "string" ? body.centreId.trim() : ""; } catch { /* validated below */ }
  if (!centreId) return NextResponse.json({ error: "Management centre is required." }, { status: 400 });
  const { sessionID } = await context.params;
  const call = await callProtectedBackend(request, `/v1/sessions/${encodeURIComponent(sessionID)}/publish?centre_id=${encodeURIComponent(centreId)}`, { method: "POST" });
  return protectedJsonResponse(call, (body) => mapSession(body as BackendSession), "The session could not be published.");
}
