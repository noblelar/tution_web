import { NextRequest, NextResponse } from "next/server";

import {
  BackendTokenPair,
  BackendMFARequired,
  callBackend,
  clearSessionCookies,
  mapUser,
  publicBackendError,
  setSessionCookies,
  setMFAChallengeCookie,
  verifyMutationRequest,
} from "@/lib/server-auth";

export async function POST(request: NextRequest) {
  if (!verifyMutationRequest(request)) {
    return NextResponse.json({ error: "Request verification failed." }, { status: 403 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }
  if (
    typeof body !== "object" ||
    body === null ||
    typeof (body as Record<string, unknown>).email !== "string" ||
    typeof (body as Record<string, unknown>).password !== "string"
  ) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }
  const backendResponse = await callBackend(
    "/v1/auth/login",
    { method: "POST", body: JSON.stringify(body) },
    request,
  );

  if (backendResponse.status === 202) {
    const challenge = (await backendResponse.json()) as BackendMFARequired;
    if (!challenge.mfa_required || !challenge.challenge_token || !challenge.expires_at) {
      return NextResponse.json(
        { error: "Authentication is temporarily unavailable." },
        { status: 503 },
      );
    }
    const response = NextResponse.json(
      {
        mfaRequired: true,
        enrollmentRequired: challenge.enrollment_required,
        expiresAt: challenge.expires_at,
      },
      { status: 202 },
    );
    response.headers.set("cache-control", "no-store");
    clearSessionCookies(response);
    setMFAChallengeCookie(response, challenge.challenge_token, challenge.expires_at);
    return response;
  }
  if (!backendResponse.ok) {
    return NextResponse.json(
      { error: publicBackendError(backendResponse.status) },
      { status: backendResponse.status === 429 ? 429 : backendResponse.status === 401 ? 401 : 503 },
    );
  }
  const pair = (await backendResponse.json()) as BackendTokenPair;
  const response = NextResponse.json({ user: mapUser(pair.user) });
  response.headers.set("cache-control", "no-store");
  setSessionCookies(response, pair);
  return response;
}
