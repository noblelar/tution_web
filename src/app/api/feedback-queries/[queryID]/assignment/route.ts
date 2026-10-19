import { NextRequest, NextResponse } from "next/server";

import { callProtectedBackend, verifyMutationRequest } from "@/lib/server-auth";
import { protectedJsonResponse } from "@/lib/server-bff";
import {
  type BackendFeedbackQuery,
  feedbackQueryAssignmentInput,
  mapFeedbackQuery,
} from "@/lib/server-feedback";

type RouteContext = { params: Promise<{ queryID: string }> };

export async function PUT(request: NextRequest, context: RouteContext) {
  if (!verifyMutationRequest(request)) {
    return NextResponse.json({ error: "Request verification failed." }, { status: 403 });
  }
  const input = await feedbackQueryAssignmentInput(request);
  if (!input) {
    return NextResponse.json({ error: "An eligible tutor is required." }, { status: 400 });
  }
  const { queryID } = await context.params;
  const call = await callProtectedBackend(
    request,
    `/v1/feedback-queries/${encodeURIComponent(queryID)}/assignment`,
    { method: "PUT", body: JSON.stringify(input) },
  );
  return protectedJsonResponse(
    call,
    (body) => mapFeedbackQuery(body as BackendFeedbackQuery),
    "The query could not be assigned.",
  );
}
