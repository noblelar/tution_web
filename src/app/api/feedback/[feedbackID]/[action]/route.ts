import { NextRequest, NextResponse } from "next/server";

import { callProtectedBackend, verifyMutationRequest } from "@/lib/server-auth";
import { protectedJsonResponse } from "@/lib/server-bff";
import { type BackendSessionFeedback, mapSessionFeedback } from "@/lib/server-feedback";

type RouteContext = { params: Promise<{ feedbackID: string; action: string }> };

const allowedActions = new Set(["publish", "withdraw"]);

export async function POST(request: NextRequest, context: RouteContext) {
  if (!verifyMutationRequest(request)) {
    return NextResponse.json({ error: "Request verification failed." }, { status: 403 });
  }
  const { feedbackID, action } = await context.params;
  if (!allowedActions.has(action)) {
    return NextResponse.json({ error: "Feedback action is invalid." }, { status: 404 });
  }
  const call = await callProtectedBackend(
    request,
    `/v1/feedback/${encodeURIComponent(feedbackID)}/${action}`,
    { method: "POST" },
  );
  return protectedJsonResponse(
    call,
    (body) => mapSessionFeedback(body as BackendSessionFeedback),
    "The feedback action could not be completed.",
  );
}
