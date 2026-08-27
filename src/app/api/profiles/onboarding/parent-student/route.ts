import { NextRequest, NextResponse } from "next/server";

import { callProtectedBackend, verifyMutationRequest } from "@/lib/server-auth";
import { protectedJsonResponse } from "@/lib/server-bff";
import {
  BackendParentProfile,
  BackendParentStudentLink,
  BackendStudentProfile,
  mapParentProfile,
  mapParentStudentLink,
  mapStudentProfile,
} from "@/lib/server-profiles";

type ParentWithStudentResult = {
  parent: BackendParentProfile;
  student: BackendStudentProfile;
  parent_link: BackendParentStudentLink;
};

export async function POST(request: NextRequest) {
  if (!verifyMutationRequest(request)) {
    return NextResponse.json({ error: "Request verification failed." }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Parent and student onboarding details are required." }, { status: 400 });
  }

  const parent = objectValue(body.parent);
  const student = objectValue(body.student);
  const relationshipType = typeof body.relationshipType === "string" && body.relationshipType.trim() ? body.relationshipType.trim() : "guardian";

  const call = await callProtectedBackend(request, "/v1/profiles/onboarding/parent-student", {
    method: "POST",
    body: JSON.stringify({
      parent: parentOnboardingBody(parent),
      student: studentOnboardingBody(student),
      relationship_type: relationshipType,
    }),
  });

  return protectedJsonResponse(call, (result) => {
    const value = result as ParentWithStudentResult;
    return {
      parent: mapParentProfile(value.parent),
      student: mapStudentProfile(value.student),
      parentLink: mapParentStudentLink(value.parent_link),
    };
  });
}

function parentOnboardingBody(input: Record<string, unknown>) {
  return {
    first_name: stringValue(input.firstName),
    last_name: stringValue(input.lastName),
    email: stringValue(input.email),
    phone_number: optionalString(input.phoneNumber),
    centre_id: stringValue(input.centreId),
    preferred_name: optionalString(input.preferredName),
    address_line1: optionalString(input.addressLine1),
    address_line2: optionalString(input.addressLine2),
    city: optionalString(input.city),
    county_region: optionalString(input.countyRegion),
    postal_code: optionalString(input.postalCode),
    country: optionalString(input.country),
    marketing_opt_in: input.marketingOptIn === true,
    contact_consent: input.contactConsent === true,
  };
}

function studentOnboardingBody(input: Record<string, unknown>) {
  return {
    first_name: stringValue(input.firstName),
    last_name: stringValue(input.lastName),
    email: optionalString(input.email),
    phone_number: optionalString(input.phoneNumber),
    centre_id: stringValue(input.centreId),
    preferred_name: optionalString(input.preferredName),
    date_of_birth: stringValue(input.dateOfBirth),
    gender: optionalString(input.gender),
    school_name: optionalString(input.schoolName),
    academic_year_group: optionalString(input.academicYearGroup),
    referral_source: optionalString(input.referralSource),
    notes: optionalString(input.notes),
    people_code_login_enabled: input.peopleCodeLoginEnabled !== false,
  };
}

function objectValue(value: unknown) {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function optionalString(value: unknown) {
  const trimmed = stringValue(value);
  return trimmed || undefined;
}
