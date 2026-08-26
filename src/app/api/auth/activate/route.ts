import { NextRequest, NextResponse } from "next/server";

import {
  BackendUser,
  backendErrorMessage,
  callBackend,
  mapUser,
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
    return NextResponse.json({ error: "Invitation token and password are required." }, { status: 400 });
  }
  const input = body as Record<string, unknown>;
  if (!input || typeof input.token !== "string" || typeof input.password !== "string") {
    return NextResponse.json({ error: "Invitation token and password are required." }, { status: 400 });
  }
  const backendResponse = await callBackend(
    "/v1/auth/activate",
    { method: "POST", body: JSON.stringify({ token: input.token, password: input.password }) },
    request,
  );
  if (!backendResponse.ok) {
    const status = backendResponse.status === 400 || backendResponse.status === 401 ? backendResponse.status : 503;
    return NextResponse.json(
      { error: await backendErrorMessage(backendResponse, "Account activation is temporarily unavailable.") },
      { status },
    );
  }
  const user = (await backendResponse.json()) as BackendUser;
  const response = NextResponse.json({ user: mapUser(user) });
  response.headers.set("cache-control", "no-store");
  return response;
}
