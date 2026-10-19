import { NextRequest, NextResponse } from "next/server";

import { callProtectedBackend, verifyMutationRequest } from "@/lib/server-auth";
import { protectedJsonResponse } from "@/lib/server-bff";
import {
  type BackendSessionFeedback,
  feedbackRevisionInput,
  mapSessionFeedback,
} from "@/lib/server-feedback";

type RouteContext = { params: Promise<{ feedbackID: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  if (!verifyMutationRequest(request)) {
    return NextResponse.json({ error: "Request verification failed." }, { status: 403 });
  }
  const input = await feedbackRevisionInput(request);
  if (!input) {
    return NextResponse.json({ error: "Feedback text is required and must be 7,500 characters or fewer." }, { status: 400 });
  }
  const { feedbackID } = await context.params;
  const call = await callProtectedBackend(
    request,
    `/v1/feedback/${encodeURIComponent(feedbackID)}/revisions`,
    { method: "POST", body: JSON.stringify(input) },
  );
  return protectedJsonResponse(
    call,
    (body) => mapSessionFeedback(body as BackendSessionFeedback),
    "The feedback revision could not be saved.",
  );
}
