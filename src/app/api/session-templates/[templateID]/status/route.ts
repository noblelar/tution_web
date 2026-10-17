import { NextRequest, NextResponse } from "next/server";

import { callProtectedBackend, verifyMutationRequest } from "@/lib/server-auth";
import { protectedJsonResponse } from "@/lib/server-bff";
import { BackendSessionTemplate, mapSessionTemplate } from "@/lib/server-sessions";

type RouteContext = { params: Promise<{ templateID: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  if (!verifyMutationRequest(request)) return NextResponse.json({ error: "Request verification failed." }, { status: 403 });
  let centreId = "";
  let status = "";
  try {
    const body = (await request.json()) as { centreId?: unknown; status?: unknown };
    centreId = typeof body.centreId === "string" ? body.centreId.trim() : "";
    status = typeof body.status === "string" ? body.status.trim() : "";
  } catch { /* validated below */ }
  if (!centreId || (status !== "active" && status !== "inactive")) return NextResponse.json({ error: "Template status details are invalid." }, { status: 400 });
  const { templateID } = await context.params;
  const call = await callProtectedBackend(request, `/v1/session-templates/${encodeURIComponent(templateID)}/status?centre_id=${encodeURIComponent(centreId)}`, { method: "POST", body: JSON.stringify({ status }) });
  return protectedJsonResponse(call, (body) => mapSessionTemplate(body as BackendSessionTemplate), "The template status could not be updated.");
}
