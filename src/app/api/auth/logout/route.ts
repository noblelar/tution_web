import { NextRequest, NextResponse } from "next/server";

import {
  REFRESH_COOKIE,
  callBackend,
  clearSessionCookies,
  verifyMutationRequest,
} from "@/lib/server-auth";

export async function POST(request: NextRequest) {
  if (!verifyMutationRequest(request)) {
    return NextResponse.json({ error: "Request verification failed." }, { status: 403 });
  }
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
  if (refreshToken) {
    await callBackend(
      "/v1/auth/logout",
      { method: "POST", body: JSON.stringify({ refresh_token: refreshToken }) },
      request,
    ).catch(() => undefined);
  }
  const response = NextResponse.json({ message: "signed out" });
  clearSessionCookies(response);
  return response;
}
