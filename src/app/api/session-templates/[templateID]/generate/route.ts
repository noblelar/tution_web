import { NextRequest, NextResponse } from "next/server";

import { callProtectedBackend, verifyMutationRequest } from "@/lib/server-auth";
import { protectedJsonResponse } from "@/lib/server-bff";
import { BackendSessionGenerationResult, mapSessionGenerationResult } from "@/lib/server-sessions";

type RouteContext = { params: Promise<{ templateID: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  if (!verifyMutationRequest(request)) return NextResponse.json({ error: "Request verification failed." }, { status: 403 });
  let centreId = "";
  let dates: string[] = [];
  try {
    const body = (await request.json()) as { centreId?: unknown; dates?: unknown };
    centreId = typeof body.centreId === "string" ? body.centreId.trim() : "";
    dates = Array.isArray(body.dates) ? body.dates.filter((value): value is string => typeof value === "string" && Boolean(value.trim())).map((value) => value.trim()) : [];
  } catch { /* validated below */ }
  if (!centreId || dates.length === 0) return NextResponse.json({ error: "Management centre and generation dates are required." }, { status: 400 });
  const { templateID } = await context.params;
  const call = await callProtectedBackend(request, `/v1/session-templates/${encodeURIComponent(templateID)}/generate?centre_id=${encodeURIComponent(centreId)}`, { method: "POST", body: JSON.stringify({ dates }) });
  return protectedJsonResponse(call, (body) => mapSessionGenerationResult(body as BackendSessionGenerationResult), "The sessions could not be generated.");
}
