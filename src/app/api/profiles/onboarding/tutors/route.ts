import { NextRequest, NextResponse } from "next/server";

import { callProtectedBackend, verifyMutationRequest } from "@/lib/server-auth";
import { protectedJsonResponse, protectedNoContentResponse } from "@/lib/server-bff";
import {
  BackendTutorInvitation,
  BackendTutorProfile,
  BackendTutorProfileList,
  BackendTutorManagementContext,
  BackendTutorOnboardingResult,
  mapTutorInvitation,
  mapTutorManagementContext,
  mapTutorProfile,
  mapTutorProfileList,
  mapTutorOnboardingResult,
} from "@/lib/server-profiles";
import {
  BackendTutorCapability,
  BackendTutorCapabilityList,
  mapTutorCapability,
  mapTutorCapabilityList,
} from "@/lib/server-academics";
import {
  BackendTutorAvailability,
  BackendTutorAvailabilityList,
  mapTutorAvailability,
  mapTutorAvailabilityList,
} from "@/lib/server-tutor-availability";

export async function GET(request: NextRequest) {
  if (request.nextUrl.searchParams.get("context") === "management") {
    const call = await callProtectedBackend(request, "/v1/profiles/tutors/context", {
      method: "GET",
    });
    return protectedJsonResponse(call, (body) =>
      mapTutorManagementContext(body as BackendTutorManagementContext),
    );
  }

  const availabilityFor = request.nextUrl.searchParams.get("availabilityFor")?.trim();
  if (availabilityFor) {
    const centreId = request.nextUrl.searchParams.get("centreId")?.trim();
    if (!centreId) return NextResponse.json({ error: "Management centre is required." }, { status: 400 });
    const call = await callProtectedBackend(
      request,
      `/v1/academics/tutors/${encodeURIComponent(availabilityFor)}/availability?centre_id=${encodeURIComponent(centreId)}`,
      { method: "GET" },
    );
    return protectedJsonResponse(call, (body) => mapTutorAvailabilityList(body as BackendTutorAvailabilityList));
  }

  const capabilitiesFor = request.nextUrl.searchParams.get("capabilitiesFor")?.trim();
  if (capabilitiesFor) {
    const centreId = request.nextUrl.searchParams.get("centreId")?.trim();
    if (!centreId) return NextResponse.json({ error: "Management centre is required." }, { status: 400 });
    const call = await callProtectedBackend(
      request,
      `/v1/academics/tutors/${encodeURIComponent(capabilitiesFor)}/capabilities?centre_id=${encodeURIComponent(centreId)}`,
      { method: "GET" },
    );
    return protectedJsonResponse(call, (body) => mapTutorCapabilityList(body as BackendTutorCapabilityList));
  }

  const tutorProfileId = request.nextUrl.searchParams.get("id")?.trim();
  if (tutorProfileId) {
    const call = await callProtectedBackend(
      request,
      `/v1/profiles/tutors/${encodeURIComponent(tutorProfileId)}`,
      { method: "GET" },
    );
    return protectedJsonResponse(call, (body) => mapTutorProfile(body as BackendTutorProfile));
  }

  const params = new URLSearchParams();
  const search = request.nextUrl.searchParams.get("search")?.trim();
  const status = request.nextUrl.searchParams.get("status")?.trim();
  const centreId = request.nextUrl.searchParams.get("centreId")?.trim();
  if (search) params.set("search", search);
  if (status) params.set("status", status);
  if (centreId) params.set("centre_id", centreId);

  const query = params.size ? `?${params.toString()}` : "";
  const call = await callProtectedBackend(request, `/v1/profiles/tutors${query}`, { method: "GET" });
  return protectedJsonResponse(call, (body) => mapTutorProfileList(body as BackendTutorProfileList));
}

export async function POST(request: NextRequest) {
  if (!verifyMutationRequest(request)) {
    return NextResponse.json({ error: "Request verification failed." }, { status: 403 });
  }

  const capabilityAction = request.nextUrl.searchParams.get("capabilityAction")?.trim();
  if (capabilityAction) return tutorCapabilityMutation(request, capabilityAction);

  const availabilityAction = request.nextUrl.searchParams.get("availabilityAction")?.trim();
  if (availabilityAction) return tutorAvailabilityMutation(request, availabilityAction);

  const invitationAction = request.nextUrl.searchParams.get("invitationAction")?.trim();
  if (invitationAction) return tutorInvitationMutation(request, invitationAction);

  const lifecycleAction = request.nextUrl.searchParams.get("lifecycleAction")?.trim();
  if (lifecycleAction) return tutorLifecycleMutation(request, lifecycleAction);

  const mfaAction = request.nextUrl.searchParams.get("mfaAction")?.trim();
  if (mfaAction) return tutorMFAMutation(request, mfaAction);

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Tutor onboarding details are required." }, { status: 400 });
  }

  const call = await callProtectedBackend(request, "/v1/profiles/onboarding/tutors", {
    method: "POST",
    body: JSON.stringify({
      first_name: stringValue(body.firstName),
      last_name: stringValue(body.lastName),
      email: stringValue(body.email),
      phone_number: optionalString(body.phoneNumber),
      centre_id: stringValue(body.centreId),
      preferred_name: optionalString(body.preferredName),
    }),
  });

  return protectedJsonResponse(call, (result) => mapTutorOnboardingResult(result as BackendTutorOnboardingResult));
}

export async function DELETE(request: NextRequest) {
  if (!verifyMutationRequest(request)) {
    return NextResponse.json({ error: "Request verification failed." }, { status: 403 });
  }
  if (request.nextUrl.searchParams.get("action") !== "delete-pending") {
    return NextResponse.json({ error: "Tutor account action is invalid." }, { status: 404 });
  }
  const tutorProfileId = request.nextUrl.searchParams.get("tutorProfileId")?.trim();
  if (!tutorProfileId) {
    return NextResponse.json({ error: "Tutor profile is required." }, { status: 400 });
  }
  const call = await callProtectedBackend(
    request,
    `/v1/profiles/tutors/${encodeURIComponent(tutorProfileId)}/pending-account`,
    { method: "DELETE" },
  );
  return protectedNoContentResponse(call, "The pending tutor account could not be deleted.");
}

async function tutorMFAMutation(request: NextRequest, action: string) {
  if (action !== "reset") {
    return NextResponse.json({ error: "Tutor MFA action is invalid." }, { status: 404 });
  }
  const tutorUserId = request.nextUrl.searchParams.get("tutorUserId")?.trim();
  if (!tutorUserId) {
    return NextResponse.json({ error: "Tutor account is required." }, { status: 400 });
  }
  const call = await callProtectedBackend(
    request,
    `/v1/users/${encodeURIComponent(tutorUserId)}/mfa/tutor-reset`,
    { method: "POST" },
  );
  return protectedJsonResponse(
    call,
    (body) => body as { message: string },
    "The tutor MFA enrollment could not be reset.",
  );
}

async function tutorLifecycleMutation(request: NextRequest, action: string) {
  const tutorProfileId = request.nextUrl.searchParams.get("tutorProfileId")?.trim();
  if (!tutorProfileId) {
    return NextResponse.json({ error: "Tutor profile is required." }, { status: 400 });
  }
  if (action !== "suspend" && action !== "restore" && action !== "disable") {
    return NextResponse.json({ error: "Tutor lifecycle action is invalid." }, { status: 404 });
  }

  let reason: string | undefined;
  try {
    const body = (await request.json()) as { reason?: unknown };
    if (typeof body.reason === "string" && body.reason.trim()) reason = body.reason.trim();
  } catch {
    // An empty request is valid because the lifecycle reason is optional.
  }
  if (reason && [...reason].length > 500) {
    return NextResponse.json({ error: "The internal reason must be at most 500 characters." }, { status: 400 });
  }

  const call = await callProtectedBackend(
    request,
    `/v1/profiles/tutors/${encodeURIComponent(tutorProfileId)}/lifecycle/${action}`,
    {
      method: "POST",
      body: JSON.stringify(reason ? { reason } : {}),
    },
  );
  return protectedJsonResponse(
    call,
    (body) => mapTutorProfile(body as BackendTutorProfile),
    "The tutor account status could not be updated.",
  );
}

async function tutorInvitationMutation(request: NextRequest, action: string) {
  const tutorProfileId = request.nextUrl.searchParams.get("tutorProfileId")?.trim();
  if (!tutorProfileId) {
    return NextResponse.json({ error: "Tutor profile is required." }, { status: 400 });
  }
  if (action !== "reissue" && action !== "revoke") {
    return NextResponse.json({ error: "Tutor invitation action is invalid." }, { status: 404 });
  }

  const call = await callProtectedBackend(
    request,
    `/v1/profiles/tutors/${encodeURIComponent(tutorProfileId)}/invitation/${action}`,
    { method: "POST" },
  );
  if (action === "revoke") {
    return protectedNoContentResponse(call, "The tutor invitation could not be revoked.");
  }
  return protectedJsonResponse(
    call,
    (body) => mapTutorInvitation(body as BackendTutorInvitation),
    "The tutor invitation could not be reissued.",
  );
}

async function tutorCapabilityMutation(request: NextRequest, action: string) {
  let input: Record<string, unknown>;
  try {
    input = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Tutor capability details are required." }, { status: 400 });
  }
  const centreId = stringValue(input.centreId);
  if (!centreId) return NextResponse.json({ error: "Management centre is required." }, { status: 400 });

  let path: string;
  let method: "POST" | "PUT";
  let body: string | undefined;
  if (action === "create") {
    const tutorProfileId = request.nextUrl.searchParams.get("tutorProfileId")?.trim();
    if (!tutorProfileId) return NextResponse.json({ error: "Tutor profile is required." }, { status: 400 });
    const capability = capabilityBody(input);
    if (!capability) return NextResponse.json({ error: "Subject and academic level are required." }, { status: 400 });
    path = `/v1/academics/tutors/${encodeURIComponent(tutorProfileId)}/capabilities`;
    method = "POST";
    body = JSON.stringify(capability);
  } else if (action === "update") {
    const capabilityId = request.nextUrl.searchParams.get("capabilityId")?.trim();
    const capability = capabilityBody(input);
    if (!capabilityId || !capability) return NextResponse.json({ error: "Tutor capability details are invalid." }, { status: 400 });
    path = `/v1/academics/tutor-capabilities/${encodeURIComponent(capabilityId)}`;
    method = "PUT";
    body = JSON.stringify(capability);
  } else if (action === "deactivate" || action === "reactivate") {
    const capabilityId = request.nextUrl.searchParams.get("capabilityId")?.trim();
    if (!capabilityId) return NextResponse.json({ error: "Tutor capability is required." }, { status: 400 });
    const reason = stringValue(input.reason);
    if (action === "deactivate" && !reason) return NextResponse.json({ error: "Deactivation reason is required." }, { status: 400 });
    path = `/v1/academics/tutor-capabilities/${encodeURIComponent(capabilityId)}/${action}`;
    method = "POST";
    body = action === "deactivate" ? JSON.stringify({ reason }) : undefined;
  } else {
    return NextResponse.json({ error: "Tutor capability action is invalid." }, { status: 404 });
  }

  const separator = path.includes("?") ? "&" : "?";
  const call = await callProtectedBackend(request, `${path}${separator}centre_id=${encodeURIComponent(centreId)}`, { method, body });
  return protectedJsonResponse(call, (result) => mapTutorCapability(result as BackendTutorCapability));
}

async function tutorAvailabilityMutation(request: NextRequest, action: string) {
  let input: Record<string, unknown>;
  try {
    input = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Tutor availability details are required." }, { status: 400 });
  }
  const centreId = stringValue(input.centreId);
  if (!centreId) return NextResponse.json({ error: "Management centre is required." }, { status: 400 });

  let path: string;
  let method: "POST" | "PUT";
  let body: string | undefined;
  if (action === "create") {
    const tutorProfileId = request.nextUrl.searchParams.get("tutorProfileId")?.trim();
    const availability = availabilityBody(input);
    if (!tutorProfileId || !availability) return NextResponse.json({ error: "Tutor availability details are invalid." }, { status: 400 });
    path = `/v1/academics/tutors/${encodeURIComponent(tutorProfileId)}/availability`;
    method = "POST";
    body = JSON.stringify(availability);
  } else if (action === "update") {
    const availabilityId = request.nextUrl.searchParams.get("availabilityId")?.trim();
    const availability = availabilityBody(input);
    if (!availabilityId || !availability) return NextResponse.json({ error: "Tutor availability details are invalid." }, { status: 400 });
    path = `/v1/academics/tutor-availability/${encodeURIComponent(availabilityId)}`;
    method = "PUT";
    body = JSON.stringify(availability);
  } else if (action === "deactivate" || action === "reactivate") {
    const availabilityId = request.nextUrl.searchParams.get("availabilityId")?.trim();
    if (!availabilityId) return NextResponse.json({ error: "Tutor availability is required." }, { status: 400 });
    const reason = stringValue(input.reason);
    if (action === "deactivate" && !reason) return NextResponse.json({ error: "Deactivation reason is required." }, { status: 400 });
    path = `/v1/academics/tutor-availability/${encodeURIComponent(availabilityId)}/${action}`;
    method = "POST";
    body = action === "deactivate" ? JSON.stringify({ reason }) : undefined;
  } else {
    return NextResponse.json({ error: "Tutor availability action is invalid." }, { status: 404 });
  }

  const call = await callProtectedBackend(request, `${path}?centre_id=${encodeURIComponent(centreId)}`, { method, body });
  return protectedJsonResponse(call, (result) => mapTutorAvailability(result as BackendTutorAvailability));
}

function availabilityBody(input: Record<string, unknown>) {
  const dayOfWeek = typeof input.dayOfWeek === "number" ? input.dayOfWeek : Number.NaN;
  const startTime = stringValue(input.startTime);
  const endTime = stringValue(input.endTime);
  if (!Number.isInteger(dayOfWeek) || !startTime || !endTime) return null;
  return { day_of_week: dayOfWeek, start_time: startTime, end_time: endTime };
}

function capabilityBody(input: Record<string, unknown>) {
  const subjectId = stringValue(input.subjectId);
  const academicLevelId = stringValue(input.academicLevelId);
  if (!subjectId || !academicLevelId || typeof input.isPrimarySubject !== "boolean") return null;
  return {
    subject_id: subjectId,
    academic_level_id: academicLevelId,
    is_primary_subject: input.isPrimarySubject,
  };
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function optionalString(value: unknown) {
  const trimmed = stringValue(value);
  return trimmed || undefined;
}
