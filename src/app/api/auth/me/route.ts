import { NextRequest, NextResponse } from "next/server";

import {
  ACCESS_COOKIE,
  BackendUser,
  callBackend,
  clearSessionCookies,
  mapUser,
  refreshBackendSession,
  setSessionCookies,
} from "@/lib/server-auth";

export async function GET(request: NextRequest) {
  let accessToken = request.cookies.get(ACCESS_COOKIE)?.value;
  let refreshed = null;
  if (!accessToken) {
    refreshed = await refreshBackendSession(request);
    accessToken = refreshed?.access_token;
  }
  if (!accessToken) {
    const response = NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    clearSessionCookies(response);
    return response;
  }
  let backendResponse = await callBackend("/v1/auth/me", {
    method: "GET",
    headers: { authorization: `Bearer ${accessToken}` },
  });
  if (backendResponse.status === 401 && !refreshed) {
    refreshed = await refreshBackendSession(request);
    if (refreshed) {
      backendResponse = await callBackend("/v1/auth/me", {
        method: "GET",
        headers: { authorization: `Bearer ${refreshed.access_token}` },
      });
    }
  }
  if (!backendResponse.ok) {
    const response = NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    clearSessionCookies(response);
    return response;
  }
  const user = (await backendResponse.json()) as BackendUser;
  const response = NextResponse.json({ user: mapUser(user) });
  response.headers.set("cache-control", "no-store");
  if (refreshed) setSessionCookies(response, refreshed);
  return response;
}
