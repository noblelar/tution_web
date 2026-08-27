import { NextRequest } from "next/server";

import {
  BackendUser,
  callProtectedBackend,
  mapUser,
} from "@/lib/server-auth";
import { protectedJsonResponse } from "@/lib/server-bff";

export async function GET(request: NextRequest) {
  const call = await callProtectedBackend(request, "/v1/auth/me", { method: "GET" });
  return protectedJsonResponse(
    call,
    (body) => ({ user: mapUser(body as BackendUser) }),
    "Your session could not be checked right now.",
  );
}
