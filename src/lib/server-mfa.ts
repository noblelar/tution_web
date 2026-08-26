import "server-only";

import { NextRequest, NextResponse } from "next/server";

import {
  BackendTokenPair,
  MFA_CHALLENGE_COOKIE,
  backendErrorMessage,
  callBackend,
  clearMFAChallengeCookie,
  mapUser,
  setSessionCookies,
} from "@/lib/server-auth";

export type BackendMFAEnrollment = {
  secret: string;
  otpauth_uri: string;
  expires_at: string;
};

export type BackendMFACompletion = {
  tokens: BackendTokenPair;
  recovery_codes?: string[];
};

export function mfaChallengeToken(request: NextRequest): string | null {
  return request.cookies.get(MFA_CHALLENGE_COOKIE)?.value ?? null;
}

export async function mfaBackendError(response: Response): Promise<NextResponse> {
  const status = response.status === 400 || response.status === 401 || response.status === 429
    ? response.status
    : 503;
  const result = NextResponse.json(
    { error: await backendErrorMessage(response, "MFA is temporarily unavailable.") },
    { status },
  );
  result.headers.set("cache-control", "no-store");
  if (status === 401) clearMFAChallengeCookie(result);
  return result;
}

export async function completeMFARequest(
  request: NextRequest,
  path: string,
  verification: { code?: string; recovery_code?: string },
  enrollment: boolean,
): Promise<NextResponse> {
  const challengeToken = mfaChallengeToken(request);
  if (!challengeToken) {
    return NextResponse.json({ error: "MFA challenge is invalid or expired." }, { status: 401 });
  }
  const backendResponse = await callBackend(
    path,
    {
      method: "POST",
      body: JSON.stringify({ challenge_token: challengeToken, ...verification }),
    },
    request,
  );
  if (!backendResponse.ok) return mfaBackendError(backendResponse);

  let pair: BackendTokenPair;
  let recoveryCodes: string[] = [];
  if (enrollment) {
    const completion = (await backendResponse.json()) as BackendMFACompletion;
    pair = completion.tokens;
    recoveryCodes = completion.recovery_codes ?? [];
  } else {
    pair = (await backendResponse.json()) as BackendTokenPair;
  }
  const response = NextResponse.json({
    user: mapUser(pair.user),
    recoveryCodes,
  });
  response.headers.set("cache-control", "no-store");
  setSessionCookies(response, pair);
  clearMFAChallengeCookie(response);
  return response;
}

