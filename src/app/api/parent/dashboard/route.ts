import { NextRequest } from "next/server";

import { callProtectedBackend } from "@/lib/server-auth";
import { protectedJsonResponse } from "@/lib/server-bff";
import { mapParentDashboard } from "@/lib/server-parent-dashboard";

export async function GET(request: NextRequest) {
  const call = await callProtectedBackend(request, "/v1/reporting/parent-dashboard", {
    method: "GET",
  });
  return protectedJsonResponse(
    call,
    mapParentDashboard,
    "Your dashboard could not be loaded right now.",
  );
}
