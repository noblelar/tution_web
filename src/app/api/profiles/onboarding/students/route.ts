import { NextRequest, NextResponse } from "next/server";

import {
  BackendStudentPlacement,
  BackendStudentPlacementList,
  mapStudentPlacement,
  mapStudentPlacementList,
} from "@/lib/server-student-placements";

import { callProtectedBackend, verifyMutationRequest } from "@/lib/server-auth";
import { protectedJsonResponse } from "@/lib/server-bff";
import { BackendStudentOnboardingResult, mapStudentOnboardingResult } from "@/lib/server-profiles";

export async function GET(request: NextRequest) {
  const studentProfileId = request.nextUrl.searchParams.get("placementsFor")?.trim();
  const centreId = request.nextUrl.searchParams.get("centreId")?.trim();
  if (!studentProfileId || !centreId) {
    return NextResponse.json({ error: "Student and management centre are required." }, { status: 400 });
  }
  const call = await callProtectedBackend(
    request,
    `/v1/academics/students/${encodeURIComponent(studentProfileId)}/placements?centre_id=${encodeURIComponent(centreId)}`,
    { method: "GET" },
  );
  return protectedJsonResponse(call, (body) => mapStudentPlacementList(body as BackendStudentPlacementList));
}

async function studentPlacementMutation(request: NextRequest, action: string) {
  let input: Record<string, unknown>;
  try {
    input = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Student academic placement details are required." }, { status: 400 });
  }
  const centreId = placementStringValue(input.centreId);
  if (!centreId) return NextResponse.json({ error: "Management centre is required." }, { status: 400 });

  let path: string;
  let method: "POST" | "PUT";
  let body: string | undefined;
  if (action === "create") {
    const studentProfileId = request.nextUrl.searchParams.get("studentProfileId")?.trim();
    const placement = studentPlacementBody(input);
    if (!studentProfileId || !placement) return NextResponse.json({ error: "Student academic placement details are invalid." }, { status: 400 });
    path = `/v1/academics/students/${encodeURIComponent(studentProfileId)}/placements`;
    method = "POST";
    body = JSON.stringify(placement);
  } else if (action === "update") {
    const placementId = request.nextUrl.searchParams.get("placementId")?.trim();
    const placement = studentPlacementBody(input);
    if (!placementId || !placement) return NextResponse.json({ error: "Student academic placement details are invalid." }, { status: 400 });
    path = `/v1/academics/student-placements/${encodeURIComponent(placementId)}`;
    method = "PUT";
    body = JSON.stringify(placement);
  } else if (action === "deactivate" || action === "reactivate") {
    const placementId = request.nextUrl.searchParams.get("placementId")?.trim();
    if (!placementId) return NextResponse.json({ error: "Student academic placement is required." }, { status: 400 });
    const reason = placementStringValue(input.reason);
    if (action === "deactivate" && !reason) return NextResponse.json({ error: "Deactivation reason is required." }, { status: 400 });
    path = `/v1/academics/student-placements/${encodeURIComponent(placementId)}/${action}`;
    method = "POST";
    body = action === "deactivate" ? JSON.stringify({ reason }) : undefined;
  } else {
    return NextResponse.json({ error: "Student placement action is invalid." }, { status: 404 });
  }

  const call = await callProtectedBackend(request, `${path}?centre_id=${encodeURIComponent(centreId)}`, { method, body });
  return protectedJsonResponse(call, (result) => mapStudentPlacement(result as BackendStudentPlacement));
}

function studentPlacementBody(input: Record<string, unknown>) {
  const academicYearId = placementStringValue(input.academicYearId);
  const academicLevelId = placementStringValue(input.academicLevelId);
  if (!academicYearId || !academicLevelId) return null;
  return { academic_year_id: academicYearId, academic_level_id: academicLevelId };
}

function placementStringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: NextRequest) {
  const placementAction = request.nextUrl.searchParams.get("placementAction")?.trim();
  if (placementAction) {
    if (!verifyMutationRequest(request)) {
      return NextResponse.json({ error: "Request verification failed." }, { status: 403 });
    }
    return studentPlacementMutation(request, placementAction);
  }
  if (!verifyMutationRequest(request)) {
    return NextResponse.json({ error: "Request verification failed." }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Student onboarding details are required." }, { status: 400 });
  }

  const call = await callProtectedBackend(request, "/v1/profiles/onboarding/students", {
    method: "POST",
    body: JSON.stringify(studentOnboardingBody(body)),
  });

  return protectedJsonResponse(call, (result) => mapStudentOnboardingResult(result as BackendStudentOnboardingResult));
}

export function studentOnboardingBody(input: Record<string, unknown>) {
  return {
    first_name: stringValue(input.firstName),
    last_name: stringValue(input.lastName),
    email: optionalString(input.email),
    phone_number: optionalString(input.phoneNumber),
    centre_id: stringValue(input.centreId),
    parent_profile_id: optionalString(input.parentProfileId),
    relationship_type: optionalString(input.relationshipType),
    relationship_description: optionalString(input.relationshipDescription),
    preferred_name: optionalString(input.preferredName),
    date_of_birth: stringValue(input.dateOfBirth),
    gender: optionalString(input.gender),
    school_name: optionalString(input.schoolName),
    academic_year_group: optionalString(input.academicYearGroup),
    referral_source: optionalString(input.referralSource),
    notes: optionalString(input.notes),
    people_code_login_enabled: input.peopleCodeLoginEnabled === true,
  };
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function optionalString(value: unknown) {
  const trimmed = stringValue(value);
  return trimmed || undefined;
}
