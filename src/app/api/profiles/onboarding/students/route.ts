import { NextRequest, NextResponse } from "next/server";

import { callProtectedBackend, verifyMutationRequest } from "@/lib/server-auth";
import { protectedJsonResponse } from "@/lib/server-bff";
import { BackendParentStudentLink, BackendStudentProfile, mapParentStudentLink, mapStudentProfile } from "@/lib/server-profiles";

type StudentOnboardingResult = {
  student: BackendStudentProfile;
  parent_link?: BackendParentStudentLink;
};

export async function POST(request: NextRequest) {
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

  return protectedJsonResponse(call, (result) => {
    const value = result as StudentOnboardingResult;
    return {
      student: mapStudentProfile(value.student),
      parentLink: value.parent_link ? mapParentStudentLink(value.parent_link) : undefined,
    };
  });
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
