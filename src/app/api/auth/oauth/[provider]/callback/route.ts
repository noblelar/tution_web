import { createHash, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

import {
  applicationOrigin,
  BackendTokenPair,
  callBackend,
  oauthStateCookie,
  sessionCookiesAreSecure,
  setSessionCookies,
} from "@/lib/server-auth";

const providers = new Set(["google", "apple"]);

type OAuthCallbackValues = {
  code: string;
  state: string;
  error: string;
};

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ provider: string }> },
) {
  return complete(request, context, {
    code: request.nextUrl.searchParams.get("code") ?? "",
    state: request.nextUrl.searchParams.get("state") ?? "",
    error: request.nextUrl.searchParams.get("error") ?? "",
  });
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ provider: string }> },
) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.redirect(new URL("/login?error=oauth_callback", request.url), 303);
  }
  return complete(request, context, {
    code: String(form.get("code") ?? ""),
    state: String(form.get("state") ?? ""),
    error: String(form.get("error") ?? ""),
  });
}

async function complete(
  request: NextRequest,
  context: { params: Promise<{ provider: string }> },
  callback: OAuthCallbackValues,
) {
  const { provider } = await context.params;
  const cookieName = oauthStateCookie(provider);
  const expectedState = request.cookies.get(cookieName)?.value ?? "";
  if (
    !providers.has(provider) ||
    callback.error !== "" ||
    callback.code === "" ||
    !equalSecret(callback.state, expectedState)
  ) {
    return clearStateAndRedirect(request, provider, "oauth_callback");
  }
  const redirectUri = `${applicationOrigin(request.nextUrl.origin)}/api/auth/oauth/${provider}/callback`;
  const backendResponse = await callBackend(
    `/v1/auth/oauth/${provider}/callback`,
    {
      method: "POST",
      body: JSON.stringify({
        code: callback.code,
        state: callback.state,
        redirect_uri: redirectUri,
      }),
    },
    request,
  );
  if (!backendResponse.ok) {
    const reason = backendResponse.status === 403 ? "account_not_allowed" : "oauth_callback";
    return clearStateAndRedirect(request, provider, reason);
  }
  const pair = (await backendResponse.json()) as BackendTokenPair;
  const response = NextResponse.redirect(new URL("/", request.url), 303);
  clearOAuthState(response, provider);
  setSessionCookies(response, pair);
  response.headers.set("cache-control", "no-store");
  return response;
}

function equalSecret(left: string, right: string): boolean {
  if (!left || !right) return false;
  const leftHash = createHash("sha256").update(left).digest();
  const rightHash = createHash("sha256").update(right).digest();
  return timingSafeEqual(leftHash, rightHash);
}

function clearStateAndRedirect(
  request: NextRequest,
  provider: string,
  reason: string,
): NextResponse {
  const response = NextResponse.redirect(new URL(`/login?error=${reason}`, request.url), 303);
  clearOAuthState(response, provider);
  response.headers.set("cache-control", "no-store");
  return response;
}

function clearOAuthState(response: NextResponse, provider: string): void {
  response.cookies.set(oauthStateCookie(provider), "", {
    httpOnly: true,
    secure: sessionCookiesAreSecure(),
    sameSite: "lax",
    path: `/api/auth/oauth/${provider}/callback`,
    maxAge: 0,
  });
}
