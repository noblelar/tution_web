import { NextRequest, NextResponse } from "next/server";

import { callProtectedBackend, verifyMutationRequest } from "@/lib/server-auth";
import { protectedJsonResponse } from "@/lib/server-bff";
import { type BackendFeedbackQuery, mapFeedbackQuery } from "@/lib/server-feedback";

type RouteContext = { params: Promise<{ queryID: string; action: string }> };

const allowedActions = new Set(["propose-resolution", "resolve", "reopen"]);

export async function POST(request: NextRequest, context: RouteContext) {
  if (!verifyMutationRequest(request)) {
    return NextResponse.json({ error: "Request verification failed." }, { status: 403 });
  }
  const { queryID, action } = await context.params;
  if (!allowedActions.has(action)) {
    return NextResponse.json({ error: "Query action is invalid." }, { status: 404 });
  }
  const call = await callProtectedBackend(
    request,
    `/v1/feedback-queries/${encodeURIComponent(queryID)}/${action}`,
    { method: "POST" },
  );
  return protectedJsonResponse(
    call,
    (body) => mapFeedbackQuery(body as BackendFeedbackQuery),
    "The query action could not be completed.",
  );
}
