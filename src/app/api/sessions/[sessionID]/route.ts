import { NextRequest, NextResponse } from "next/server";

import { sessionInput } from "../route";
import { callProtectedBackend, verifyMutationRequest } from "@/lib/server-auth";
import { protectedJsonResponse } from "@/lib/server-bff";
import { BackendSession, mapSession } from "@/lib/server-sessions";

type RouteContext = { params: Promise<{ sessionID: string }> };

export async function PUT(request: NextRequest, context: RouteContext) {
  if (!verifyMutationRequest(request)) return NextResponse.json({ error: "Request verification failed." }, { status: 403 });
  const input = await sessionInput(request);
  if (!input) return NextResponse.json({ error: "Session details are invalid." }, { status: 400 });
  const { sessionID } = await context.params;
  const call = await callProtectedBackend(request, `/v1/sessions/${encodeURIComponent(sessionID)}?centre_id=${encodeURIComponent(input.centreId)}`, { method: "PUT", body: JSON.stringify(input.body) });
  return protectedJsonResponse(call, (body) => mapSession(body as BackendSession), "The session could not be updated.");
}
