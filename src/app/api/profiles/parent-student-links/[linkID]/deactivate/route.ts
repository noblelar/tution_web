import { NextRequest, NextResponse } from "next/server";

import { BackendParentStudentLink, mapParentStudentLink } from "@/lib/server-profiles";
import { callProtectedBackend, verifyMutationRequest } from "@/lib/server-auth";
import { protectedJsonResponse } from "@/lib/server-bff";

type RouteContext = { params: Promise<{ linkID: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  if (!verifyMutationRequest(request)) {
    return NextResponse.json({ error: "Request verification failed." }, { status: 403 });
  }
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Deactivation reason is required." }, { status: 400 });
  }
  if (typeof body.reason !== "string") {
    return NextResponse.json({ error: "Deactivation reason is required." }, { status: 400 });
  }
  const { linkID } = await context.params;
  const call = await callProtectedBackend(request, `/v1/profiles/parent-student-links/${encodeURIComponent(linkID)}/deactivate`, {
    method: "POST",
    body: JSON.stringify({ reason: body.reason }),
  });
  return protectedJsonResponse(call, (result) => mapParentStudentLink(result as BackendParentStudentLink));
}
