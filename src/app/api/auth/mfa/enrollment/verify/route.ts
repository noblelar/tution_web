import { NextRequest, NextResponse } from "next/server";

import { verifyMutationRequest } from "@/lib/server-auth";
import { completeMFARequest } from "@/lib/server-mfa";

export async function POST(request: NextRequest) {
  if (!verifyMutationRequest(request)) {
    return NextResponse.json({ error: "Request verification failed." }, { status: 403 });
  }
  let code = "";
  try {
    const body = (await request.json()) as { code?: unknown };
    if (typeof body.code === "string") code = body.code.trim();
  } catch {
    // Uniform validation response below.
  }
  if (!/^[0-9]{6}$/.test(code)) {
    return NextResponse.json({ error: "Enter the six-digit authenticator code." }, { status: 400 });
  }
  return completeMFARequest(
    request,
    "/v1/auth/mfa/enrollment/verify",
    { code },
    true,
  );
}

