import { NextRequest, NextResponse } from "next/server";

import {
  clearSessionCookies,
  mapUser,
  refreshBackendSession,
  setSessionCookies,
  verifyMutationRequest,
} from "@/lib/server-auth";

export async function POST(request: NextRequest) {
  if (!verifyMutationRequest(request)) {
    return NextResponse.json({ error: "Request verification failed." }, { status: 403 });
  }
  const pair = await refreshBackendSession(request);
  if (!pair) {
    const response = NextResponse.json({ error: "Session expired." }, { status: 401 });
    clearSessionCookies(response);
    return response;
  }
  const response = NextResponse.json({ user: mapUser(pair.user) });
  response.headers.set("cache-control", "no-store");
  setSessionCookies(response, pair);
  return response;
}
