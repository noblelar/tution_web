import { NextRequest, NextResponse } from "next/server";

import { BackendManagedCentre, mapManagedCentre } from "@/lib/server-centres";
import { callProtectedBackend, verifyMutationRequest } from "@/lib/server-auth";
import { protectedJsonResponse } from "@/lib/server-bff";

type RouteParameters = { params: Promise<{ centreID: string }> };

export async function POST(request: NextRequest, context: RouteParameters) {
  if (!verifyMutationRequest(request)) {
    return NextResponse.json({ error: "Request verification failed." }, { status: 403 });
  }

  const { centreID } = await context.params;
  const call = await callProtectedBackend(request, `/v1/centres/${encodeURIComponent(centreID)}/reactivate`, {
    method: "POST",
  });
  return protectedJsonResponse(call, (result) => mapManagedCentre(result as BackendManagedCentre));
}
