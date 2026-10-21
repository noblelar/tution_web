import { NextRequest, NextResponse } from "next/server";

import { callProtectedBackend, verifyMutationRequest } from "@/lib/server-auth";
import { protectedJsonResponse } from "@/lib/server-bff";
import { mapStudentReflectionPromptState, studentPromptDeferralInput } from "@/lib/server-student-notes";

type RouteContext = { params: Promise<{ promptID: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  if (!verifyMutationRequest(request)) {
    return NextResponse.json({ error: "Request verification failed." }, { status: 403 });
  }
  const input = await studentPromptDeferralInput(request);
  if (!input) return NextResponse.json({ error: "Reminder interval is invalid." }, { status: 400 });
  const { promptID } = await context.params;
  const call = await callProtectedBackend(
    request,
    `/v1/student/notes/prompts/${encodeURIComponent(promptID)}/defer`,
    { method: "POST", body: JSON.stringify(input) },
  );
  return protectedJsonResponse(call, mapStudentReflectionPromptState, "Your learning reminder could not be postponed.");
}
