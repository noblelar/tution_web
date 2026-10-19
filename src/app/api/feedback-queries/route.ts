import { NextRequest, NextResponse } from "next/server";

import { callProtectedBackend, verifyMutationRequest } from "@/lib/server-auth";
import { protectedJsonResponse } from "@/lib/server-bff";
import {
  type BackendFeedbackQuery,
  type BackendFeedbackQueryList,
  feedbackQueryInput,
  mapFeedbackQuery,
  mapFeedbackQueryList,
} from "@/lib/server-feedback";

export async function GET(request: NextRequest) {
  const centreId = request.nextUrl.searchParams.get("centreId")?.trim() ?? "";
  if (!centreId) {
    return NextResponse.json({ error: "Centre is required." }, { status: 400 });
  }
  const call = await callProtectedBackend(
    request,
    `/v1/feedback-queries?centre_id=${encodeURIComponent(centreId)}`,
    { method: "GET" },
  );
  return protectedJsonResponse(
    call,
    (body) => mapFeedbackQueryList(body as BackendFeedbackQueryList),
    "Feedback queries could not be loaded.",
  );
}

export async function POST(request: NextRequest) {
  if (!verifyMutationRequest(request)) {
    return NextResponse.json({ error: "Request verification failed." }, { status: 403 });
  }
  const input = await feedbackQueryInput(request);
  if (!input) {
    return NextResponse.json({ error: "Query details are invalid." }, { status: 400 });
  }
  const call = await callProtectedBackend(
    request,
    "/v1/feedback-queries",
    { method: "POST", body: JSON.stringify(input) },
  );
  return protectedJsonResponse(
    call,
    (body) => mapFeedbackQuery(body as BackendFeedbackQuery),
    "The query could not be created.",
  );
}
