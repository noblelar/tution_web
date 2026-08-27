import "server-only";

import { NextResponse } from "next/server";

import {
  ProtectedBackendCall,
  backendErrorMessage,
  clearSessionCookies,
  setSessionCookies,
} from "@/lib/server-auth";

const forwardedErrorStatuses = new Set([400, 401, 403, 404, 409, 429]);

export async function protectedJsonResponse<T>(
  call: ProtectedBackendCall,
  mapSuccess: (body: unknown) => T,
  fallbackError = "The account service is temporarily unavailable.",
): Promise<NextResponse> {
  let response: NextResponse;
  if (call.response.ok) {
    try {
      response = NextResponse.json(mapSuccess(await call.response.json()));
    } catch {
      response = NextResponse.json({ error: fallbackError }, { status: 503 });
    }
  } else {
    const status = forwardedErrorStatuses.has(call.response.status) ? call.response.status : 503;
    response = NextResponse.json(
      { error: await backendErrorMessage(call.response, fallbackError) },
      { status },
    );
  }
  response.headers.set("cache-control", "no-store");
  if (call.refreshed) setSessionCookies(response, call.refreshed);
  if (call.sessionInvalid) clearSessionCookies(response);
  return response;
}
