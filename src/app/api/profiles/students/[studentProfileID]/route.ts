import { NextRequest, NextResponse } from "next/server";

import { callProtectedBackend, verifyMutationRequest } from "@/lib/server-auth";
import { protectedJsonResponse } from "@/lib/server-bff";
import { BackendStudentProfile, BackendTutorInvitation, mapStudentProfile, mapTutorInvitation } from "@/lib/server-profiles";

type RouteContext = {
  params: Promise<{ studentProfileID: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const { studentProfileID } = await context.params;
  const call = await callProtectedBackend(
    request,
    `/v1/profiles/students/${encodeURIComponent(studentProfileID)}`,
    { method: "GET" },
  );
  return protectedJsonResponse(call, (body) => mapStudentProfile(body as BackendStudentProfile));
}

export async function POST(request: NextRequest, context: RouteContext) {
  if (!verifyMutationRequest(request)) return NextResponse.json({ error: "Request verification failed." }, { status: 403 });
  if (request.nextUrl.searchParams.get("action") !== "reissue") return NextResponse.json({ error: "Unknown action." }, { status: 404 });
  const { studentProfileID } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(studentProfileID)) return NextResponse.json({ error: "Student profile is invalid." }, { status: 400 });
  const call = await callProtectedBackend(request, `/v1/profiles/students/${encodeURIComponent(studentProfileID)}/invitation/reissue`, { method: "POST" });
  return protectedJsonResponse(call, (body) => mapTutorInvitation(body as BackendTutorInvitation));
}
