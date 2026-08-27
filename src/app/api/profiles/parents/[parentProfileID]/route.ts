import { NextRequest } from "next/server";

import { callProtectedBackend } from "@/lib/server-auth";
import { protectedJsonResponse } from "@/lib/server-bff";
import { BackendParentProfile, mapParentProfile } from "@/lib/server-profiles";

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
