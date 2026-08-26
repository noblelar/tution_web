import { NextRequest, NextResponse } from "next/server";

import { BackendStudentProfile, mapStudentProfile } from "@/lib/server-profiles";
import { callProtectedBackend, verifyMutationRequest } from "@/lib/server-auth";
import { protectedJsonResponse } from "@/lib/server-bff";

type RouteContext = {
  params: Promise<{ studentProfileID: string }>;
};

export async function PUT(request: NextRequest, context: RouteContext) {
  if (!verifyMutationRequest(request)) {
    return NextResponse.json({ error: "Request verification failed." }, { status: 403 });
  }
  const { studentProfileID } = await context.params;
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Student access settings are required." }, { status: 400 });
  }
  if (typeof body.peopleCodeLoginEnabled !== "boolean") {
    return NextResponse.json({ error: "Student access settings are invalid." }, { status: 400 });
  }
  const call = await callProtectedBackend(
    request,
    `/v1/profiles/students/${encodeURIComponent(studentProfileID)}/access`,
    {
      method: "PUT",
      body: JSON.stringify({ people_code_login_enabled: body.peopleCodeLoginEnabled }),
    },
  );
  return protectedJsonResponse(call, (result) => mapStudentProfile(result as BackendStudentProfile));
}
