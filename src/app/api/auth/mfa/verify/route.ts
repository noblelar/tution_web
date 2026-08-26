import { NextRequest, NextResponse } from "next/server";

import { verifyMutationRequest } from "@/lib/server-auth";
import { completeMFARequest } from "@/lib/server-mfa";

export async function POST(request: NextRequest) {
  if (!verifyMutationRequest(request)) {
    return NextResponse.json({ error: "Request verification failed." }, { status: 403 });
  }
  let code = "";
  let recoveryCode = "";
  try {
    const body = (await request.json()) as { code?: unknown; recoveryCode?: unknown };
    if (typeof body.code === "string") code = body.code.trim();
    if (typeof body.recoveryCode === "string") recoveryCode = body.recoveryCode.trim();
  } catch {
    // Uniform validation response below.
  }
  if ((code === "") === (recoveryCode === "")) {
    return NextResponse.json({ error: "Provide one MFA verification method." }, { status: 400 });
  }
  return completeMFARequest(
    request,
    "/v1/auth/mfa/verify",
    recoveryCode ? { recovery_code: recoveryCode } : { code },
    false,
  );
}
