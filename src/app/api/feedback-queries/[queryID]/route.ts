import { NextRequest } from "next/server";

import { callProtectedBackend } from "@/lib/server-auth";
import { protectedJsonResponse } from "@/lib/server-bff";
import { type BackendFeedbackQuery, mapFeedbackQuery } from "@/lib/server-feedback";

type RouteContext = { params: Promise<{ queryID: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const { queryID } = await context.params;
  const call = await callProtectedBackend(
    request,
    `/v1/feedback-queries/${encodeURIComponent(queryID)}`,
    { method: "GET" },
  );
  return protectedJsonResponse(
    call,
    (body) => mapFeedbackQuery(body as BackendFeedbackQuery),
    "The feedback query could not be loaded.",
  );
}
