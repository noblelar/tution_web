import { NextRequest } from "next/server";

import { callProtectedBackend } from "@/lib/server-auth";
import { protectedJsonResponse } from "@/lib/server-bff";
import { mapStudentDashboard } from "@/lib/server-student-dashboard";

export async function GET(request: NextRequest) {
  const call = await callProtectedBackend(request, "/v1/reporting/student-dashboard", {
    method: "GET",
  });
  return protectedJsonResponse(
    call,
    mapStudentDashboard,
    "Your dashboard could not be loaded right now.",
  );
}
