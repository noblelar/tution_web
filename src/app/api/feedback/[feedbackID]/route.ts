import { NextRequest } from "next/server";

import { callProtectedBackend } from "@/lib/server-auth";
import { protectedJsonResponse } from "@/lib/server-bff";
import { type BackendSessionFeedback, mapSessionFeedback } from "@/lib/server-feedback";

type RouteContext = { params: Promise<{ feedbackID: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const { feedbackID } = await context.params;
  const call = await callProtectedBackend(
    request,
    `/v1/feedback/${encodeURIComponent(feedbackID)}`,
    { method: "GET" },
  );
  return protectedJsonResponse(
    call,
    (body) => mapSessionFeedback(body as BackendSessionFeedback),
    "Session feedback could not be loaded.",
  );
}
