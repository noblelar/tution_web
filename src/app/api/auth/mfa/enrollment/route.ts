import { NextRequest, NextResponse } from "next/server";

import {
  BackendTokenPair,
  MFA_CHALLENGE_COOKIE,
  callBackend,
  callProtectedBackend,
  clearMFAChallengeCookie,
  clearSessionCookies,
  setMFAChallengeCookie,
  setSessionCookies,
  verifyMutationRequest,
} from "@/lib/server-auth";
import { protectedJsonResponse, protectedNoContentResponse } from "@/lib/server-bff";
import { BackendMFAEnrollment, mfaBackendError, mfaChallengeToken } from "@/lib/server-mfa";

type BackendTutorMFAStatus = { enabled: boolean; required: boolean };
type BackendTutorEnrollment = BackendMFAEnrollment & { challenge_token: string };
type BackendTutorCompletion = { tokens: BackendTokenPair; recovery_codes?: string[] };

export async function GET(request: NextRequest) {
  const call = await callProtectedBackend(request, "/v1/auth/mfa/tutor", { method: "GET" });
  return protectedJsonResponse(call, (body) => body as BackendTutorMFAStatus, "MFA status could not be loaded.");
}

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

export async function PATCH(request: NextRequest) {
  if (!verifyMutationRequest(request)) {
    return NextResponse.json({ error: "Request verification failed." }, { status: 403 });
  }
  const call = await callProtectedBackend(request, "/v1/auth/mfa/tutor/enrollment", { method: "POST" });
  if (!call.response.ok) {
    return protectedJsonResponse(call, (body) => body as never, "MFA enrollment could not be started.");
  }
  let enrollment: BackendTutorEnrollment;
  try {
    enrollment = (await call.response.json()) as BackendTutorEnrollment;
  } catch {
    return NextResponse.json({ error: "MFA enrollment could not be started." }, { status: 503 });
  }
  const response = NextResponse.json({
    secret: enrollment.secret,
    otpAuthUri: enrollment.otpauth_uri,
    expiresAt: enrollment.expires_at,
  });
  response.headers.set("cache-control", "no-store");
  if (call.refreshed) setSessionCookies(response, call.refreshed);
  setMFAChallengeCookie(response, enrollment.challenge_token, enrollment.expires_at);
  return response;
}

export async function PUT(request: NextRequest) {
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
  const challengeToken = request.cookies.get(MFA_CHALLENGE_COOKIE)?.value;
  if (!challengeToken) {
    return NextResponse.json({ error: "MFA challenge is invalid or expired." }, { status: 401 });
  }
  const call = await callProtectedBackend(request, "/v1/auth/mfa/tutor/enrollment/verify", {
    method: "POST",
    body: JSON.stringify({ challenge_token: challengeToken, code }),
  });
  if (!call.response.ok) {
    return protectedJsonResponse(call, (body) => body as never, "The authenticator code could not be verified.");
  }
  let completion: BackendTutorCompletion;
  try {
    completion = (await call.response.json()) as BackendTutorCompletion;
  } catch {
    return NextResponse.json({ error: "MFA enrollment could not be completed." }, { status: 503 });
  }
  const response = NextResponse.json({ recoveryCodes: completion.recovery_codes ?? [] });
  response.headers.set("cache-control", "no-store");
  setSessionCookies(response, completion.tokens);
  clearMFAChallengeCookie(response);
  return response;
}

export async function DELETE(request: NextRequest) {
  if (!verifyMutationRequest(request)) {
    return NextResponse.json({ error: "Request verification failed." }, { status: 403 });
  }
  const call = await callProtectedBackend(request, "/v1/auth/mfa/tutor", { method: "DELETE" });
  const response = await protectedNoContentResponse(call, "MFA could not be disabled.");
  if (call.response.ok) clearSessionCookies(response);
  return response;
}

