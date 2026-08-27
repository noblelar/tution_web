import { NextRequest, NextResponse } from "next/server";

import { callProtectedBackend, verifyMutationRequest } from "@/lib/server-auth";
import { protectedJsonResponse } from "@/lib/server-bff";
import { BackendParentProfile, mapParentProfile } from "@/lib/server-profiles";

type ParentOnboardingResult = {
  parent: BackendParentProfile;
};

export async function POST(request: NextRequest) {
  if (!verifyMutationRequest(request)) {
    return NextResponse.json({ error: "Request verification failed." }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Parent onboarding details are required." }, { status: 400 });
  }

  const call = await callProtectedBackend(request, "/v1/profiles/onboarding/parents", {
    method: "POST",
    body: JSON.stringify(parentOnboardingBody(body)),
  });

  return protectedJsonResponse(call, (result) => ({
    parent: mapParentProfile((result as ParentOnboardingResult).parent),
  }));
}

export function parentOnboardingBody(input: Record<string, unknown>) {
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

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function optionalString(value: unknown) {
  const trimmed = stringValue(value);
  return trimmed || undefined;
}
