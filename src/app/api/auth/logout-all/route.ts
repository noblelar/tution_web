import { NextRequest, NextResponse } from "next/server";

import {
  ACCESS_COOKIE,
  callBackend,
  clearSessionCookies,
  verifyMutationRequest,
} from "@/lib/server-auth";

export async function POST(request: NextRequest) {
  if (!verifyMutationRequest(request)) {
    return NextResponse.json({ error: "Request verification failed." }, { status: 403 });
  }
  const accessToken = request.cookies.get(ACCESS_COOKIE)?.value;
  if (accessToken) {
    await callBackend(
      "/v1/auth/logout-all",
      { method: "POST", headers: { authorization: `Bearer ${accessToken}` } },
      request,
    ).catch(() => undefined);
  }
  const response = NextResponse.json({ message: "all sessions signed out" });
  clearSessionCookies(response);
  return response;
}
