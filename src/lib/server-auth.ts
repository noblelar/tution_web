import "server-only";

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

export const ACCESS_COOKIE = "tution_access";
export const REFRESH_COOKIE = "tution_refresh";
export const CSRF_COOKIE = "tution_csrf";
export const MFA_CHALLENGE_COOKIE = "tution_mfa_challenge";
export const OAUTH_STATE_COOKIE_PREFIX = "tution_oauth_state_";

const apiBaseUrl = process.env.INTERNAL_API_BASE_URL ?? "http://localhost:8083";
const publicUrl = process.env.APP_PUBLIC_URL;
const secureCookies = publicUrl
  ? new URL(publicUrl).protocol === "https:"
  : process.env.NODE_ENV === "production";

export type BackendRoleGrant = {
  role_key: string;
  assignment_scope: string;
  centre_id?: string;
};

export type BackendUser = {
  id: string;
  organization_id: string;
  first_name: string;
  last_name: string;
  email: string;
  roles: BackendRoleGrant[];
};

export type AppUser = {
  id: string;
  organizationId: string;
  firstName: string;
  lastName: string;
  email: string;
  roles: Array<{
    roleKey: string;
    assignmentScope: string;
    centreId?: string;
  }>;
};

export type BackendTokenPair = {
  access_token: string;
  access_expires_at: string;
  refresh_token: string;
  refresh_expires_at: string;
  user: BackendUser;
};

export type BackendMFARequired = {
  mfa_required: true;
  enrollment_required: boolean;
  challenge_token: string;
  expires_at: string;
};

export type RefreshBackendResult =
  | { status: "refreshed"; pair: BackendTokenPair }
  | { status: "missing" | "invalid" | "in_progress" | "unavailable"; pair: null };

export type ProtectedBackendCall = {
  response: Response;
  refreshed: BackendTokenPair | null;
  sessionInvalid: boolean;
};

type CachedRefreshAttempt = {
  expiresAt: number;
  result: Promise<RefreshBackendResult>;
};

const refreshCoalescingWindowMs = 2_000;
const refreshAttempts = new Map<string, CachedRefreshAttempt>();

export function mapUser(user: BackendUser): AppUser {
  return {
    id: user.id,
    organizationId: user.organization_id,
    firstName: user.first_name,
    lastName: user.last_name,
    email: user.email,
    roles: user.roles.map((role) => ({
      roleKey: role.role_key,
      assignmentScope: role.assignment_scope,
      centreId: role.centre_id,
    })),
  };
}

export function newCsrfToken(): string {
  return randomBytes(32).toString("base64url");
}

export function setCsrfCookie(response: NextResponse, token: string): void {
  response.cookies.set(CSRF_COOKIE, token, {
    httpOnly: false,
    secure: secureCookies,
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60,
  });
}

export function setSessionCookies(
  response: NextResponse,
  pair: BackendTokenPair,
): void {
  response.cookies.set(ACCESS_COOKIE, pair.access_token, {
    httpOnly: true,
    secure: secureCookies,
    sameSite: "strict",
    path: "/",
    expires: new Date(pair.access_expires_at),
  });
  response.cookies.set(REFRESH_COOKIE, pair.refresh_token, {
    httpOnly: true,
    secure: secureCookies,
    sameSite: "strict",
    path: "/",
    expires: new Date(pair.refresh_expires_at),
  });
}

export function setMFAChallengeCookie(
  response: NextResponse,
  challengeToken: string,
  expiresAt: string,
): void {
  response.cookies.set(MFA_CHALLENGE_COOKIE, challengeToken, {
    httpOnly: true,
    secure: secureCookies,
    sameSite: "strict",
    path: "/",
    expires: new Date(expiresAt),
  });
}

export function clearMFAChallengeCookie(response: NextResponse): void {
  response.cookies.set(MFA_CHALLENGE_COOKIE, "", {
    httpOnly: true,
    secure: secureCookies,
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });
}

export function oauthStateCookie(provider: string): string {
  return `${OAUTH_STATE_COOKIE_PREFIX}${provider}`;
}

export function sessionCookiesAreSecure(): boolean {
  return secureCookies;
}

export function applicationOrigin(fallbackOrigin: string): string {
  return publicUrl ? new URL(publicUrl).origin : fallbackOrigin;
}

export function clearSessionCookies(response: NextResponse): void {
  response.cookies.set(ACCESS_COOKIE, "", {
    httpOnly: true,
    secure: secureCookies,
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });
  response.cookies.set(REFRESH_COOKIE, "", {
    httpOnly: true,
    secure: secureCookies,
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });

  clearMFAChallengeCookie(response);
}

export function verifyMutationRequest(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  const configuredOrigin = process.env.APP_PUBLIC_URL;
  const allowedOrigins = new Set([request.nextUrl.origin]);
  if (configuredOrigin) {
    try {
      allowedOrigins.add(new URL(configuredOrigin).origin);
    } catch {
      return false;
    }
  }
  if (!origin || !allowedOrigins.has(origin)) {
    return false;
  }
  const cookieToken = request.cookies.get(CSRF_COOKIE)?.value;
  const headerToken = request.headers.get("x-csrf-token");
  if (!cookieToken || !headerToken) {
    return false;
  }
  const cookieHash = createHash("sha256").update(cookieToken).digest();
  const headerHash = createHash("sha256").update(headerToken).digest();
  return timingSafeEqual(cookieHash, headerHash);
}

export async function callBackend(
  path: string,
  init: RequestInit,
  request?: NextRequest,
): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set("accept", "application/json");
  if (init.body) {
    headers.set("content-type", "application/json");
  }
  if (request) {
    const requestId = request.headers.get("x-request-id");
    const forwardedFor = request.headers.get("x-forwarded-for");
    const userAgent = request.headers.get("user-agent");
    if (requestId) headers.set("x-request-id", requestId);
    if (forwardedFor) headers.set("x-forwarded-for", forwardedFor);
    if (userAgent) headers.set("user-agent", userAgent);
  }
  return fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });
}

export async function refreshBackendSession(
  request: NextRequest,
): Promise<RefreshBackendResult> {
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
  if (!refreshToken) return { status: "missing", pair: null };

  const now = Date.now();
  const cacheKey = createHash("sha256").update(refreshToken).digest("base64url");
  const cached = refreshAttempts.get(cacheKey);
  if (cached && cached.expiresAt > now) return cached.result;
  for (const [key, attempt] of refreshAttempts) {
    if (attempt.expiresAt <= now) refreshAttempts.delete(key);
  }

  const result = performBackendRefresh(request, refreshToken);
  refreshAttempts.set(cacheKey, { expiresAt: now + refreshCoalescingWindowMs, result });
  return result;
}

async function performBackendRefresh(
  request: NextRequest,
  refreshToken: string,
): Promise<RefreshBackendResult> {
  let backendResponse: Response;
  try {
    backendResponse = await callBackend(
      "/v1/auth/refresh",
      { method: "POST", body: JSON.stringify({ refresh_token: refreshToken }) },
      request,
    );
  } catch {
    return { status: "unavailable", pair: null };
  }
  if (backendResponse.ok) {
    try {
      return { status: "refreshed", pair: (await backendResponse.json()) as BackendTokenPair };
    } catch {
      return { status: "unavailable", pair: null };
    }
  }
  if (backendResponse.status === 401) return { status: "invalid", pair: null };
  if (backendResponse.status === 409) return { status: "in_progress", pair: null };
  return { status: "unavailable", pair: null };
}

export async function callProtectedBackend(
  request: NextRequest,
  path: string,
  init: RequestInit,
): Promise<ProtectedBackendCall> {
  let accessToken = request.cookies.get(ACCESS_COOKIE)?.value;
  let refreshed: BackendTokenPair | null = null;
  let refreshResult: RefreshBackendResult | null = null;

  if (!accessToken) {
    refreshResult = await refreshBackendSession(request);
    if (refreshResult.status === "refreshed") {
      refreshed = refreshResult.pair;
      accessToken = refreshed.access_token;
    }
  }
  if (!accessToken) {
    const temporarilyUnavailable = refreshResult?.status === "in_progress" || refreshResult?.status === "unavailable";
    return {
      response: new Response(JSON.stringify({ error: temporarilyUnavailable ? "Session renewal is temporarily unavailable." : "Not authenticated." }), {
        status: temporarilyUnavailable ? 503 : 401,
        headers: { "content-type": "application/json" },
      }),
      refreshed,
      sessionInvalid: !temporarilyUnavailable,
    };
  }

  const call = (token: string) => {
    const headers = new Headers(init.headers);
    headers.set("authorization", `Bearer ${token}`);
    return callBackend(path, { ...init, headers }, request);
  };

  let response: Response;
  try {
    response = await call(accessToken);
  } catch {
    return {
      response: new Response(JSON.stringify({ error: "The application service is temporarily unavailable." }), {
        status: 503,
        headers: { "content-type": "application/json" },
      }),
      refreshed,
      sessionInvalid: false,
    };
  }
  if (response.status === 401 && !refreshed) {
    refreshResult = await refreshBackendSession(request);
    if (refreshResult.status === "refreshed") {
      refreshed = refreshResult.pair;
      try {
        response = await call(refreshed.access_token);
      } catch {
        return {
          response: new Response(JSON.stringify({ error: "The application service is temporarily unavailable." }), {
            status: 503,
            headers: { "content-type": "application/json" },
          }),
          refreshed,
          sessionInvalid: false,
        };
      }
    } else if (refreshResult.status === "in_progress" || refreshResult.status === "unavailable") {
      response = new Response(JSON.stringify({ error: "Session renewal is temporarily unavailable." }), {
        status: 503,
        headers: { "content-type": "application/json" },
      });
    }
  }
  const sessionInvalid = response.status === 401 &&
    (refreshResult?.status === "invalid" || refreshResult?.status === "missing");
  return { response, refreshed, sessionInvalid };
}

export async function backendErrorMessage(
  response: Response,
  fallback: string,
): Promise<string> {
  try {
    const body = (await response.clone().json()) as { error?: unknown };
    return typeof body.error === "string" && body.error.trim() ? body.error : fallback;
  } catch {
    return fallback;
  }
}

export function publicBackendError(status: number): string {
  if (status === 401 || status === 429) return "Invalid email or password.";
  return "Authentication is temporarily unavailable.";
}
