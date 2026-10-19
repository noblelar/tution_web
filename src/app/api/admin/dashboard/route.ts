import { NextRequest, NextResponse } from "next/server";

import { callProtectedBackend } from "@/lib/server-auth";
import { protectedJsonResponse } from "@/lib/server-bff";
import { mapAdminDashboard, type BackendOverview } from "@/lib/server-admin-dashboard";

export async function GET(request: NextRequest) {
  const query = new URLSearchParams();
  for (const [browserKey, backendKey] of [["centreId", "centre_id"], ["from", "from"], ["through", "through"], ["academicYearId", "academic_year_id"]] as const) {
    const value = request.nextUrl.searchParams.get(browserKey)?.trim();
    if (value && value.length > 64) {
      return NextResponse.json({ error: "Dashboard filters are invalid." }, { status: 400 });
    }
    if (value) query.set(backendKey, value);
  }
  const suffix = query.size ? `?${query.toString()}` : "";
  const call = await callProtectedBackend(request, `/v1/reporting/dashboard${suffix}`, { method: "GET" });
  return protectedJsonResponse(call, (body) => mapAdminDashboard(body as BackendOverview), "Dashboard could not be loaded.");
}
