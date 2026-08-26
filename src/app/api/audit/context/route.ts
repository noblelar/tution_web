import { NextRequest } from "next/server";

import { BackendAuditAccessContext, mapAuditAccessContext } from "@/lib/server-audit";
import { callProtectedBackend } from "@/lib/server-auth";
import { protectedJsonResponse } from "@/lib/server-bff";

export async function GET(request: NextRequest) {
  const call = await callProtectedBackend(request, "/v1/audit/context", { method: "GET" });
  return protectedJsonResponse(
    call,
    (body) => mapAuditAccessContext(body as BackendAuditAccessContext),
    "Audit operations are temporarily unavailable.",
  );
}
