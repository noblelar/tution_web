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
  const refresh = await refreshBackendSession(request);
  if (refresh.status !== "refreshed") {
    if (refresh.status === "invalid" || refresh.status === "missing") {
      const response = NextResponse.json({ error: "Session expired." }, { status: 401 });
      clearSessionCookies(response);
      return response;
    }
    return NextResponse.json(
      { error: refresh.status === "in_progress" ? "Session renewal is already in progress." : "Session renewal is temporarily unavailable." },
      { status: refresh.status === "in_progress" ? 409 : 503 },
    );
  }
  const pair = refresh.pair;
  const response = NextResponse.json({ user: mapUser(pair.user) });
  response.headers.set("cache-control", "no-store");
  setSessionCookies(response, pair);
  return response;
}
