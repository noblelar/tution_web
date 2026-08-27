import { NextRequest, NextResponse } from "next/server";

import { callProtectedBackend, verifyMutationRequest } from "@/lib/server-auth";
import { protectedJsonResponse } from "@/lib/server-bff";

export async function POST(request: NextRequest) {
  if (!verifyMutationRequest(request)) {
    return NextResponse.json({ error: "Request verification failed." }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Tutor onboarding details are required." }, { status: 400 });
  }

  const call = await callProtectedBackend(request, "/v1/profiles/onboarding/tutors", {
    method: "POST",
    body: JSON.stringify({
      first_name: stringValue(body.firstName),
      last_name: stringValue(body.lastName),
      email: stringValue(body.email),
      phone_number: optionalString(body.phoneNumber),
      centre_id: stringValue(body.centreId),
      preferred_name: optionalString(body.preferredName),
    }),
  });

  return protectedJsonResponse(call, (result) => result);
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function optionalString(value: unknown) {
  const trimmed = stringValue(value);
  return trimmed || undefined;
}
