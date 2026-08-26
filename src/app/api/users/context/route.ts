import { NextRequest } from "next/server";

import { mapManagementContext, BackendManagementContext } from "@/lib/server-accounts";
import { callProtectedBackend } from "@/lib/server-auth";
import { protectedJsonResponse } from "@/lib/server-bff";

export async function GET(request: NextRequest) {
  const call = await callProtectedBackend(request, "/v1/users/management-context", { method: "GET" });
  return protectedJsonResponse(call, (body) => mapManagementContext(body as BackendManagementContext));
}
