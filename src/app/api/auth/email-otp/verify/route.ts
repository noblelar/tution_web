import { NextRequest, NextResponse } from "next/server";

import {
  BackendTokenPair,
  callBackend,
  mapUser,
  setSessionCookies,
  verifyMutationRequest,
} from "@/lib/server-auth";

export async function POST(request: NextRequest) {
  if (!verifyMutationRequest(request)) {
    return NextResponse.json({ error: "Request verification failed." }, { status: 403 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Email and code are required." }, { status: 400 });
  }
  if (
    typeof body !== "object" ||
    body === null ||
    typeof (body as Record<string, unknown>).email !== "string" ||
    typeof (body as Record<string, unknown>).code !== "string"
  ) {
    return NextResponse.json({ error: "Email and code are required." }, { status: 400 });
  }
  const backendResponse = await callBackend(
    "/v1/auth/email-otp/verify",
    { method: "POST", body: JSON.stringify(body) },
    request,
  );
  if (!backendResponse.ok) {
    const unauthorized = backendResponse.status === 401;
    return NextResponse.json(
      { error: unauthorized ? "Email code is invalid or expired." : "Email sign-in is temporarily unavailable." },
      { status: unauthorized ? 401 : 503, headers: { "cache-control": "no-store" } },
    );
  }
  const pair = (await backendResponse.json()) as BackendTokenPair;
  const response = NextResponse.json({ user: mapUser(pair.user) });
  response.headers.set("cache-control", "no-store");
  setSessionCookies(response, pair);
  return response;
}
