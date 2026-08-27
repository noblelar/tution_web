import { NextRequest, NextResponse } from "next/server";

import { BackendSubject, mapSubject } from "@/lib/server-academics";
import { callProtectedBackend, verifyMutationRequest } from "@/lib/server-auth";
import { protectedJsonResponse } from "@/lib/server-bff";

type RouteContext = { params: Promise<{ subjectID: string; action: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  if (!verifyMutationRequest(request)) return NextResponse.json({ error: "Request verification failed." }, { status: 403 });
  const { subjectID, action } = await context.params;
  if (action !== "deactivate" && action !== "reactivate") return NextResponse.json({ error: "Subject action is invalid." }, { status: 404 });
  let input: { centreId?: unknown; reason?: unknown };
  try { input = (await request.json()) as typeof input; } catch { return NextResponse.json({ error: "Management centre is required." }, { status: 400 }); }
  if (typeof input.centreId !== "string" || !input.centreId.trim()) return NextResponse.json({ error: "Management centre is required." }, { status: 400 });
  if (action === "deactivate" && (typeof input.reason !== "string" || !input.reason.trim())) return NextResponse.json({ error: "Deactivation reason is required." }, { status: 400 });
  const call = await callProtectedBackend(request, `/v1/academics/subjects/${encodeURIComponent(subjectID)}/${action}?centre_id=${encodeURIComponent(input.centreId)}`, { method: "POST", body: action === "deactivate" ? JSON.stringify({ reason: input.reason }) : undefined });
  return protectedJsonResponse(call, (body) => mapSubject(body as BackendSubject));
}
