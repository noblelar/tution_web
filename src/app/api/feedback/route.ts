import { NextRequest, NextResponse } from "next/server";

import { callProtectedBackend, verifyMutationRequest } from "@/lib/server-auth";
import { protectedJsonResponse } from "@/lib/server-bff";
import {
  type BackendSessionFeedback,
  type BackendSessionFeedbackList,
  feedbackDraftInput,
  mapSessionFeedback,
  mapSessionFeedbackList,
} from "@/lib/server-feedback";

export async function GET(request: NextRequest) {
  const centreId = request.nextUrl.searchParams.get("centreId")?.trim() ?? "";
  if (!centreId) {
    return NextResponse.json({ error: "Centre is required." }, { status: 400 });
  }
  const call = await callProtectedBackend(
    request,
    `/v1/feedback?centre_id=${encodeURIComponent(centreId)}`,
    { method: "GET" },
  );
  return protectedJsonResponse(
    call,
    (body) => mapSessionFeedbackList(body as BackendSessionFeedbackList),
    "Session feedback could not be loaded.",
  );
}

export async function POST(request: NextRequest) {
  if (!verifyMutationRequest(request)) {
    return NextResponse.json({ error: "Request verification failed." }, { status: 403 });
  }
  const input = await feedbackDraftInput(request);
  if (!input) {
    return NextResponse.json({ error: "Session feedback details are invalid." }, { status: 400 });
  }
  const call = await callProtectedBackend(
    request,
    "/v1/feedback",
    { method: "POST", body: JSON.stringify(input) },
  );
  return protectedJsonResponse(
    call,
    (body) => mapSessionFeedback(body as BackendSessionFeedback),
    "Session feedback could not be saved.",
  );
}
