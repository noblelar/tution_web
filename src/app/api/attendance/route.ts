import { NextRequest } from "next/server";

import { callProtectedBackend } from "@/lib/server-auth";
import { protectedJsonResponse } from "@/lib/server-bff";
import { type BackendAttendanceContext, mapAttendanceContext } from "@/lib/server-attendance";

export async function GET(request: NextRequest) {
  const centreId = request.nextUrl.searchParams.get("centreId")?.trim() ?? "";
  const call = await callProtectedBackend(request, `/v1/attendance?centre_id=${encodeURIComponent(centreId)}`, { method: "GET" });
  return protectedJsonResponse(call, (body) => mapAttendanceContext(body as BackendAttendanceContext), "Attendance could not be loaded.");
}

