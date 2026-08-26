import { NextRequest } from "next/server";

import { BackendAuditEventList, mapAuditEventList } from "@/lib/server-audit";
import { callProtectedBackend } from "@/lib/server-auth";
import { protectedJsonResponse } from "@/lib/server-bff";

const queryMap = new Map([
  ["centreId", "centre_id"],
  ["actionKey", "action_key"],
  ["outcome", "outcome"],
  ["actorUserId", "actor_user_id"],
  ["occurredFrom", "occurred_from"],
  ["occurredTo", "occurred_to"],
  ["cursor", "cursor"],
  ["limit", "limit"],
]);

export async function GET(request: NextRequest) {
  const backendQuery = new URLSearchParams();
  for (const [browserKey, backendKey] of queryMap) {
    const value = request.nextUrl.searchParams.get(browserKey)?.trim();
    if (value) backendQuery.set(backendKey, value);
  }
  const suffix = backendQuery.size ? `?${backendQuery.toString()}` : "";
  const call = await callProtectedBackend(request, `/v1/audit/events${suffix}`, { method: "GET" });
  return protectedJsonResponse(
    call,
    (body) => mapAuditEventList(body as BackendAuditEventList),
    "Audit events are temporarily unavailable.",
  );
}
