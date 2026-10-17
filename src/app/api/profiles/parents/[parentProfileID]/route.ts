import { NextRequest, NextResponse } from "next/server";

import { callProtectedBackend, verifyMutationRequest } from "@/lib/server-auth";
import { protectedJsonResponse } from "@/lib/server-bff";
import { BackendParentProfile, BackendTutorInvitation, mapParentProfile, mapTutorInvitation } from "@/lib/server-profiles";

type RouteContext = {
  params: Promise<{ parentProfileID: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const { parentProfileID } = await context.params;
  const call = await callProtectedBackend(
    request,
    `/v1/profiles/parents/${encodeURIComponent(parentProfileID)}`,
    { method: "GET" },
  );
  return protectedJsonResponse(call, (body) => mapParentProfile(body as BackendParentProfile));
}

export async function POST(request: NextRequest, context: RouteContext) {
  if (!verifyMutationRequest(request)) return NextResponse.json({ error: "Request verification failed." }, { status: 403 });
  if (request.nextUrl.searchParams.get("action") !== "reissue") return NextResponse.json({ error: "Unknown action." }, { status: 404 });
  const { parentProfileID } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(parentProfileID)) return NextResponse.json({ error: "Parent profile is invalid." }, { status: 400 });
  const call = await callProtectedBackend(request, `/v1/profiles/parents/${encodeURIComponent(parentProfileID)}/invitation/reissue`, { method: "POST" });
  return protectedJsonResponse(call, (body) => mapTutorInvitation(body as BackendTutorInvitation));
}
