import { NextRequest, NextResponse } from "next/server";

import { callBackend, verifyMutationRequest } from "@/lib/server-auth";

export async function POST(request: NextRequest) {
  if (!verifyMutationRequest(request)) {
    return NextResponse.json({ error: "Request verification failed." }, { status: 403 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }
  if (
    typeof body !== "object" ||
    body === null ||
    typeof (body as Record<string, unknown>).email !== "string"
  ) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }
  const backendResponse = await callBackend(
    "/v1/auth/email-otp/request",
    { method: "POST", body: JSON.stringify(body) },
    request,
  );
  if (!backendResponse.ok) {
    return NextResponse.json(
      { error: "Email sign-in is temporarily unavailable." },
      { status: 503, headers: { "cache-control": "no-store" } },
    );
  }
  return NextResponse.json(await backendResponse.json(), {
    status: 202,
    headers: { "cache-control": "no-store" },
  });
}
