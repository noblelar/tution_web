import { NextRequest, NextResponse } from "next/server";

import { BackendOAuthStart } from "@/lib/server-alternative-auth";
import {
  applicationOrigin,
  callBackend,
  oauthStateCookie,
  sessionCookiesAreSecure,
} from "@/lib/server-auth";

const providers = new Set(["google", "apple"]);

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ provider: string }> },
) {
  const { provider } = await context.params;
  if (!providers.has(provider)) {
    return NextResponse.redirect(new URL("/login?error=oauth_method", request.url));
  }
  const redirectUri = `${applicationOrigin(request.nextUrl.origin)}/api/auth/oauth/${provider}/callback`;
  const backendResponse = await callBackend(
    `/v1/auth/oauth/${provider}/start`,
    { method: "POST", body: JSON.stringify({ redirect_uri: redirectUri }) },
    request,
  );
  if (!backendResponse.ok) {
    return NextResponse.redirect(new URL("/login?error=oauth_unavailable", request.url));
  }
  const started = (await backendResponse.json()) as BackendOAuthStart;
  let destination: URL;
  try {
    destination = new URL(started.authorization_url);
  } catch {
    return NextResponse.redirect(new URL("/login?error=oauth_unavailable", request.url));
  }
  if (destination.protocol !== "https:") {
    return NextResponse.redirect(new URL("/login?error=oauth_unavailable", request.url));
  }
  const response = NextResponse.redirect(destination);
  const secure = sessionCookiesAreSecure();
  response.cookies.set(oauthStateCookie(provider), started.state, {
    httpOnly: true,
    secure,
    sameSite: provider === "apple" && secure ? "none" : "lax",
    path: `/api/auth/oauth/${provider}/callback`,
    expires: new Date(started.expires_at),
  });
  response.headers.set("cache-control", "no-store");
  return response;
}
