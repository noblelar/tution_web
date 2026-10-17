import { NextRequest, NextResponse } from "next/server";

import { callProtectedBackend, verifyMutationRequest } from "@/lib/server-auth";
import { protectedJsonResponse } from "@/lib/server-bff";
import { BackendSession, BackendSessionList, mapSession, mapSessionList } from "@/lib/server-sessions";

export async function GET(request: NextRequest) {
  const centreId = request.nextUrl.searchParams.get("centreId")?.trim();
  const query = centreId ? `?centre_id=${encodeURIComponent(centreId)}` : "";
  const call = await callProtectedBackend(request, `/v1/sessions${query}`, { method: "GET" });
  return protectedJsonResponse(call, (body) => mapSessionList(body as BackendSessionList), "Sessions could not be loaded.");
}

export async function POST(request: NextRequest) {
  if (!verifyMutationRequest(request)) return NextResponse.json({ error: "Request verification failed." }, { status: 403 });
  const input = await sessionInput(request);
  if (!input) return NextResponse.json({ error: "Session details are invalid." }, { status: 400 });
  const call = await callProtectedBackend(request, `/v1/sessions?centre_id=${encodeURIComponent(input.centreId)}`, {
    method: "POST",
    body: JSON.stringify(input.body),
  });
  return protectedJsonResponse(call, (body) => mapSession(body as BackendSession), "The session could not be created.");
}

export async function sessionInput(request: NextRequest) {
  try {
    const value = (await request.json()) as Record<string, unknown>;
    const centreId = text(value.centreId);
    const offeredSubjects = subjectInput(value.offeredSubjects);
    const academicYearId = text(value.academicYearId);
    const startsAt = text(value.startsAt);
    if (!centreId || !offeredSubjects || !academicYearId || !startsAt) return null;
    const maximumCapacity = optionalPositiveInteger(value.maximumCapacity);
    if (value.maximumCapacity !== undefined && value.maximumCapacity !== "" && maximumCapacity === undefined) return null;
    return {
      centreId,
      body: {
        offered_subjects: offeredSubjects,
        academic_year_id: academicYearId,
        starts_at: startsAt,
        booking_deadline_at: optionalText(value.bookingDeadlineAt),
        maximum_capacity: maximumCapacity,
      },
    };
  } catch {
    return null;
  }
}

function text(value: unknown) { return typeof value === "string" ? value.trim() : ""; }
function optionalText(value: unknown) { return text(value) || undefined; }
function subjectInput(value: unknown) {
  if (!Array.isArray(value) || !value.length || value.length > 50) return null;
  const subjectIDs = new Set<string>();
  const result = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") return null;
    const record = entry as Record<string, unknown>;
    const subjectId = text(record.subjectId);
    if (!subjectId || subjectIDs.has(subjectId) || !Array.isArray(record.tutorProfileIds)) return null;
    const tutorProfileIDs = record.tutorProfileIds.map(text);
    if (tutorProfileIDs.length > 20 || tutorProfileIDs.some((id) => !id) || new Set(tutorProfileIDs).size !== tutorProfileIDs.length) return null;
    subjectIDs.add(subjectId);
    result.push({ subject_id: subjectId, tutor_profile_ids: tutorProfileIDs });
  }
  return result;
}
function optionalPositiveInteger(value: unknown) {
  if (value === undefined || value === null || value === "") return undefined;
  const result = typeof value === "number" ? value : Number(value);
  return Number.isInteger(result) && result > 0 && result <= 1000 ? result : undefined;
}
