import { NextRequest, NextResponse } from "next/server";

import { BackendStudentProfile, mapStudentProfile } from "@/lib/server-profiles";
import { callProtectedBackend, verifyMutationRequest } from "@/lib/server-auth";
import { protectedJsonResponse } from "@/lib/server-bff";

type RouteContext = { params: Promise<{ studentProfileID: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  if (!verifyMutationRequest(request)) {
    return NextResponse.json({ error: "Request verification failed." }, { status: 403 });
  }
  const { studentProfileID } = await context.params;
  const call = await callProtectedBackend(
    request,
    `/v1/profiles/students/${encodeURIComponent(studentProfileID)}/reactivate`,
    { method: "POST" },
  );
  return protectedJsonResponse(call, (result) => mapStudentProfile(result as BackendStudentProfile));
}
