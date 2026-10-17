import { NextRequest, NextResponse } from "next/server";

import { templateInput } from "../route";
import { callProtectedBackend, verifyMutationRequest } from "@/lib/server-auth";
import { protectedJsonResponse } from "@/lib/server-bff";
import { BackendSessionTemplate, mapSessionTemplate } from "@/lib/server-sessions";

type RouteContext = { params: Promise<{ templateID: string }> };

export async function PUT(request: NextRequest, context: RouteContext) {
  if (!verifyMutationRequest(request)) return NextResponse.json({ error: "Request verification failed." }, { status: 403 });
  const input = await templateInput(request);
  if (!input) return NextResponse.json({ error: "Session template details are invalid." }, { status: 400 });
  const { templateID } = await context.params;
  const call = await callProtectedBackend(request, `/v1/session-templates/${encodeURIComponent(templateID)}?centre_id=${encodeURIComponent(input.centreId)}`, { method: "PUT", body: JSON.stringify(input.body) });
  return protectedJsonResponse(call, (body) => mapSessionTemplate(body as BackendSessionTemplate), "The session template could not be updated.");
}
