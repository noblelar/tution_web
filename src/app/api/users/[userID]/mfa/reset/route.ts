import { NextRequest, NextResponse } from "next/server";

import { callProtectedBackend, verifyMutationRequest } from "@/lib/server-auth";
import { protectedJsonResponse } from "@/lib/server-bff";

type RouteParameters = { params: Promise<{ userID: string }> };

export async function POST(request: NextRequest, context: RouteParameters) {
  if (!verifyMutationRequest(request)) {
    return NextResponse.json({ error: "Request verification failed." }, { status: 403 });
  }
  const { userID } = await context.params;
  const call = await callProtectedBackend(
    request,
    `/v1/users/${encodeURIComponent(userID)}/mfa/reset`,
    { method: "POST" },
  );
  return protectedJsonResponse(call, (body) => body as { message: string });
}
