import { NextRequest, NextResponse } from "next/server";

import { BackendParentStudentLink, mapParentStudentLink } from "@/lib/server-profiles";
import { callProtectedBackend, verifyMutationRequest } from "@/lib/server-auth";
import { protectedJsonResponse } from "@/lib/server-bff";

type RouteContext = { params: Promise<{ linkID: string }> };

export async function PUT(request: NextRequest, context: RouteContext) {
  if (!verifyMutationRequest(request)) {
    return NextResponse.json({ error: "Request verification failed." }, { status: 403 });
  }
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Relationship details are required." }, { status: 400 });
  }
  const backendBody = updateBody(body);
  if (!backendBody) {
    return NextResponse.json({ error: "Relationship details are invalid." }, { status: 400 });
  }
  const { linkID } = await context.params;
  const call = await callProtectedBackend(request, `/v1/profiles/parent-student-links/${encodeURIComponent(linkID)}`, {
    method: "PUT",
    body: JSON.stringify(backendBody),
  });
  return protectedJsonResponse(call, (result) => mapParentStudentLink(result as BackendParentStudentLink));
}

function updateBody(input: Record<string, unknown>) {
  if (
    typeof input.relationshipType !== "string" ||
    typeof input.canViewBookings !== "boolean" ||
    typeof input.canBookLessons !== "boolean" ||
    typeof input.canReceiveReports !== "boolean" ||
    typeof input.canManageCredits !== "boolean"
  ) {
    return null;
  }
  return {
    relationship_type: input.relationshipType,
    can_view_bookings: input.canViewBookings,
    can_book_lessons: input.canBookLessons,
    can_receive_reports: input.canReceiveReports,
    can_manage_credits: input.canManageCredits,
  };
}
