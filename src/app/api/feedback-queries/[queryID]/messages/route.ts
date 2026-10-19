import { NextRequest, NextResponse } from "next/server";

import { callProtectedBackend, verifyMutationRequest } from "@/lib/server-auth";
import { protectedJsonResponse } from "@/lib/server-bff";
import {
  type BackendFeedbackQuery,
  feedbackQueryMessageInput,
  mapFeedbackQuery,
} from "@/lib/server-feedback";

type RouteContext = { params: Promise<{ queryID: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  if (!verifyMutationRequest(request)) {
    return NextResponse.json({ error: "Request verification failed." }, { status: 403 });
  }
  const input = await feedbackQueryMessageInput(request);
  if (!input) {
    return NextResponse.json({ error: "A message of 7,500 characters or fewer is required." }, { status: 400 });
  }
  const { queryID } = await context.params;
  const call = await callProtectedBackend(
    request,
    `/v1/feedback-queries/${encodeURIComponent(queryID)}/messages`,
    { method: "POST", body: JSON.stringify(input) },
  );
  return protectedJsonResponse(
    call,
    (body) => mapFeedbackQuery(body as BackendFeedbackQuery),
    "The query reply could not be sent.",
  );
}
