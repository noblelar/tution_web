import { NextRequest } from "next/server";

import { callProtectedBackend } from "@/lib/server-auth";
import { protectedJsonResponse } from "@/lib/server-bff";
import { type BackendFeedbackContext, mapFeedbackContext } from "@/lib/server-feedback-context";

export async function GET(request: NextRequest) {
  const centreId = request.nextUrl.searchParams.get("centreId")?.trim();
  const query = centreId ? `?centre_id=${encodeURIComponent(centreId)}` : "";
  const call = await callProtectedBackend(request, `/v1/feedback/context${query}`, { method: "GET" });
  return protectedJsonResponse(
    call,
    (body) => mapFeedbackContext(body as BackendFeedbackContext),
    "Feedback access could not be loaded.",
  );
}
