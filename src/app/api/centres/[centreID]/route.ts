import { NextRequest, NextResponse } from "next/server";

import { BackendManagedCentre, mapManagedCentre, toBackendCentreRequest } from "@/lib/server-centres";
import { callProtectedBackend, verifyMutationRequest } from "@/lib/server-auth";
import { protectedJsonResponse } from "@/lib/server-bff";

type RouteParameters = { params: Promise<{ centreID: string }> };

export async function PATCH(request: NextRequest, context: RouteParameters) {
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

  const { centreID } = await context.params;
  const call = await callProtectedBackend(request, `/v1/centres/${encodeURIComponent(centreID)}`, {
    method: "PATCH",
    body: JSON.stringify(toBackendCentreRequest({
      code: input.code,
      name: input.name,
      address: input.address,
      timeZone: input.timeZone,
    })),
  });
  return protectedJsonResponse(call, (result) => mapManagedCentre(result as BackendManagedCentre));
}
