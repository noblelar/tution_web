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
    return NextResponse.json(
      { error: "People code and date of birth are required." },
      { status: 400 },
    );
  }
  if (
    typeof body !== "object" ||
    body === null ||
    typeof (body as Record<string, unknown>).people_code !== "string" ||
    typeof (body as Record<string, unknown>).date_of_birth !== "string"
  ) {
    return NextResponse.json(
      { error: "People code and date of birth are required." },
      { status: 400 },
    );
  }
  const backendResponse = await callBackend(
    "/v1/auth/student/people-code-login",
    { method: "POST", body: JSON.stringify(body) },
    request,
  );
  if (!backendResponse.ok) {
    const expectedFailure = backendResponse.status === 401 || backendResponse.status === 429;
    return NextResponse.json(
      {
        error: expectedFailure
          ? "People code or date of birth is invalid."
          : "Student sign-in is temporarily unavailable.",
      },
      {
        status: expectedFailure ? backendResponse.status : 503,
        headers: { "cache-control": "no-store" },
      },
    );
  }
  const pair = (await backendResponse.json()) as BackendTokenPair;
  const response = NextResponse.json({ user: mapUser(pair.user) });
  response.headers.set("cache-control", "no-store");
  setSessionCookies(response, pair);
  return response;
}
