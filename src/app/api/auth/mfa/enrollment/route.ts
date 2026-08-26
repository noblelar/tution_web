import { NextRequest, NextResponse } from "next/server";

import { callBackend, verifyMutationRequest } from "@/lib/server-auth";
import { BackendMFAEnrollment, mfaBackendError, mfaChallengeToken } from "@/lib/server-mfa";

export async function POST(request: NextRequest) {
  if (!verifyMutationRequest(request)) {
    return NextResponse.json({ error: "Request verification failed." }, { status: 403 });
  }
  const challengeToken = mfaChallengeToken(request);
  if (!challengeToken) {
    return NextResponse.json({ error: "MFA challenge is invalid or expired." }, { status: 401 });
  }
  const backendResponse = await callBackend(
    "/v1/auth/mfa/enrollment",
    { method: "POST", body: JSON.stringify({ challenge_token: challengeToken }) },
    request,
  );
  if (!backendResponse.ok) return mfaBackendError(backendResponse);
  const enrollment = (await backendResponse.json()) as BackendMFAEnrollment;
  const response = NextResponse.json({
    secret: enrollment.secret,
    otpAuthUri: enrollment.otpauth_uri,
    expiresAt: enrollment.expires_at,
  });
  response.headers.set("cache-control", "no-store");
  return response;
}

