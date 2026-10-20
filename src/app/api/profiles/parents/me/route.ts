import { NextRequest } from "next/server";

import { callProtectedBackend } from "@/lib/server-auth";
import { protectedJsonResponse } from "@/lib/server-bff";
import { mapParentSelfProfile, type BackendParentSelfProfile } from "@/lib/server-profiles";

export async function GET(request: NextRequest) {
  const call = await callProtectedBackend(request, "/v1/profiles/parents/me", { method: "GET" });
  return protectedJsonResponse(
    call,
    (body) => mapParentSelfProfile(body as BackendParentSelfProfile),
    "Your parent profile could not be loaded right now.",
  );
}
