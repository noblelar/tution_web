import { NextRequest, NextResponse } from "next/server";

import { BackendParentStudentLink, mapParentStudentLink } from "@/lib/server-profiles";
import { callProtectedBackend, verifyMutationRequest } from "@/lib/server-auth";
import { protectedJsonResponse } from "@/lib/server-bff";

type RouteContext = { params: Promise<{ linkID: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  if (!verifyMutationRequest(request)) {
    return NextResponse.json({ error: "Request verification failed." }, { status: 403 });
  }
  const { linkID } = await context.params;
  const call = await callProtectedBackend(request, `/v1/profiles/parent-student-links/${encodeURIComponent(linkID)}/reactivate`, {
    method: "POST",
  });
  return protectedJsonResponse(call, (result) => mapParentStudentLink(result as BackendParentStudentLink));
}
