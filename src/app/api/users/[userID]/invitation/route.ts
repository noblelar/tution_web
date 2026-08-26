import { NextRequest, NextResponse } from "next/server";

import { BackendInvitationDelivery, mapInvitationDelivery } from "@/lib/server-accounts";
import { callProtectedBackend, verifyMutationRequest } from "@/lib/server-auth";
import { protectedJsonResponse } from "@/lib/server-bff";

type RouteParameters = { params: Promise<{ userID: string }> };

async function centreScope(request: NextRequest): Promise<string | null> {
  try {
    const body = (await request.json()) as { centreId?: unknown };
    return typeof body.centreId === "string" && body.centreId.trim() ? body.centreId : null;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest, context: RouteParameters) {
  if (!verifyMutationRequest(request)) {
    return NextResponse.json({ error: "Request verification failed." }, { status: 403 });
  }
  const centreId = await centreScope(request);
  if (!centreId) return NextResponse.json({ error: "Centre is required." }, { status: 400 });
  const { userID } = await context.params;
  const call = await callProtectedBackend(request, `/v1/users/${encodeURIComponent(userID)}/invitation`, {
    method: "POST",
    body: JSON.stringify({ centre_id: centreId }),
  });
  return protectedJsonResponse(call, (body) => mapInvitationDelivery(body as BackendInvitationDelivery));
}

export async function DELETE(request: NextRequest, context: RouteParameters) {
  if (!verifyMutationRequest(request)) {
    return NextResponse.json({ error: "Request verification failed." }, { status: 403 });
  }
  const centreId = await centreScope(request);
  if (!centreId) return NextResponse.json({ error: "Centre is required." }, { status: 400 });
  const { userID } = await context.params;
  const call = await callProtectedBackend(request, `/v1/users/${encodeURIComponent(userID)}/invitation`, {
    method: "DELETE",
    body: JSON.stringify({ centre_id: centreId }),
  });
  return protectedJsonResponse(call, (body) => body as { message: string });
}
