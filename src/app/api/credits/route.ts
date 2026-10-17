import { NextRequest } from "next/server";

import { callProtectedBackend } from "@/lib/server-auth";
import { protectedJsonResponse } from "@/lib/server-bff";
import {
  BackendAdminCreditContext,
  BackendViewerCreditContext,
  mapAdminCreditContext,
  mapViewerCreditContext,
} from "@/lib/server-credits";

export async function GET(request: NextRequest) {
  const centreId = request.nextUrl.searchParams.get("centreId")?.trim();
  const path = centreId ? `/v1/credits?centre_id=${encodeURIComponent(centreId)}` : "/v1/credits";
  const call = await callProtectedBackend(request, path, { method: "GET" });
  return protectedJsonResponse(
    call,
    (body) => centreId ? mapAdminCreditContext(body as BackendAdminCreditContext) : mapViewerCreditContext(body as BackendViewerCreditContext),
    "Credit information could not be loaded.",
  );
}
