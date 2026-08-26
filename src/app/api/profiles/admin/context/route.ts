import { NextRequest } from "next/server";

import { BackendProfileAdminContext, mapProfileAdminContext } from "@/lib/server-profiles";
import { callProtectedBackend } from "@/lib/server-auth";
import { protectedJsonResponse } from "@/lib/server-bff";

export async function GET(request: NextRequest) {
  const call = await callProtectedBackend(request, "/v1/profiles/admin/context", { method: "GET" });
  return protectedJsonResponse(call, (body) =>
    mapProfileAdminContext(body as BackendProfileAdminContext),
  );
}
