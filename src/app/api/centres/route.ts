import { NextRequest, NextResponse } from "next/server";

import {
  BackendCentreList,
  BackendManagedCentre,
  mapCentreList,
  mapManagedCentre,
  toBackendCentreRequest,
} from "@/lib/server-centres";
import { callProtectedBackend, verifyMutationRequest } from "@/lib/server-auth";
import { protectedJsonResponse } from "@/lib/server-bff";

export async function GET(request: NextRequest) {
  const call = await callProtectedBackend(request, "/v1/centres", { method: "GET" });
  return protectedJsonResponse(call, (body) => mapCentreList(body as BackendCentreList));
}

export async function POST(request: NextRequest) {
  if (!verifyMutationRequest(request)) {
    return NextResponse.json({ error: "Request verification failed." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Centre details are required." }, { status: 400 });
  }

  const input = body as Record<string, unknown>;
  if (
    !input ||
    typeof input.code !== "string" ||
    typeof input.name !== "string" ||
    typeof input.address !== "string" ||
    typeof input.timeZone !== "string"
  ) {
    return NextResponse.json({ error: "Centre details are invalid." }, { status: 400 });
  }

  const call = await callProtectedBackend(request, "/v1/centres", {
    method: "POST",
    body: JSON.stringify(toBackendCentreRequest({
      code: input.code,
      name: input.name,
      address: input.address,
      timeZone: input.timeZone,
    })),
  });
  return protectedJsonResponse(call, (result) => mapManagedCentre(result as BackendManagedCentre));
}
