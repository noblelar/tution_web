import { NextRequest, NextResponse } from "next/server";

import {
  BackendParentStudentLink,
  BackendParentStudentLinkList,
  mapParentStudentLink,
  mapParentStudentLinkList,
} from "@/lib/server-profiles";
import { callProtectedBackend, verifyMutationRequest } from "@/lib/server-auth";
import { protectedJsonResponse } from "@/lib/server-bff";

export async function GET(request: NextRequest) {
  const params = new URLSearchParams();
  const parentProfileId = request.nextUrl.searchParams.get("parentProfileId")?.trim();
  const studentProfileId = request.nextUrl.searchParams.get("studentProfileId")?.trim();
  if (parentProfileId) params.set("parent_profile_id", parentProfileId);
  if (studentProfileId) params.set("student_profile_id", studentProfileId);
  const query = params.size ? `?${params.toString()}` : "";
  const call = await callProtectedBackend(request, `/v1/profiles/parent-student-links${query}`, { method: "GET" });
  return protectedJsonResponse(call, (body) => mapParentStudentLinkList(body as BackendParentStudentLinkList));
}

export async function POST(request: NextRequest) {
  if (!verifyMutationRequest(request)) {
    return NextResponse.json({ error: "Request verification failed." }, { status: 403 });
  }
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Relationship details are required." }, { status: 400 });
  }
  const backendBody = relationshipBody(body);
  if (!backendBody) {
    return NextResponse.json({ error: "Relationship details are invalid." }, { status: 400 });
  }
  const call = await callProtectedBackend(request, "/v1/profiles/parent-student-links", {
    method: "POST",
    body: JSON.stringify(backendBody),
  });
  return protectedJsonResponse(call, (result) => mapParentStudentLink(result as BackendParentStudentLink));
}

function relationshipBody(input: Record<string, unknown>) {
  if (
    typeof input.parentProfileId !== "string" ||
    typeof input.studentProfileId !== "string" ||
    typeof input.relationshipType !== "string" ||
    typeof input.canViewBookings !== "boolean" ||
    typeof input.canBookLessons !== "boolean" ||
    typeof input.canReceiveReports !== "boolean" ||
    typeof input.canManageCredits !== "boolean"
  ) {
    return null;
  }
  return {
    parent_profile_id: input.parentProfileId,
    student_profile_id: input.studentProfileId,
    relationship_type: input.relationshipType,
    can_view_bookings: input.canViewBookings,
    can_book_lessons: input.canBookLessons,
    can_receive_reports: input.canReceiveReports,
    can_manage_credits: input.canManageCredits,
  };
}
