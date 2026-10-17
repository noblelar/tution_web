import { NextRequest, NextResponse } from "next/server";

import { callProtectedBackend, verifyMutationRequest } from "@/lib/server-auth";
import { protectedJsonResponse } from "@/lib/server-bff";
import {
  BackendSessionTemplate,
  BackendSessionTemplateList,
  mapSessionTemplate,
  mapSessionTemplateList,
} from "@/lib/server-sessions";

export async function GET(request: NextRequest) {
  const centreId = request.nextUrl.searchParams.get("centreId")?.trim();
  if (!centreId) return NextResponse.json({ error: "Management centre is required." }, { status: 400 });
  const call = await callProtectedBackend(request, `/v1/session-templates?centre_id=${encodeURIComponent(centreId)}`, { method: "GET" });
  return protectedJsonResponse(call, (body) => mapSessionTemplateList(body as BackendSessionTemplateList), "Session templates could not be loaded.");
}

export async function POST(request: NextRequest) {
  if (!verifyMutationRequest(request)) return NextResponse.json({ error: "Request verification failed." }, { status: 403 });
  const input = await templateInput(request);
  if (!input) return NextResponse.json({ error: "Session template details are invalid." }, { status: 400 });
  const call = await callProtectedBackend(request, `/v1/session-templates?centre_id=${encodeURIComponent(input.centreId)}`, { method: "POST", body: JSON.stringify(input.body) });
  return protectedJsonResponse(call, (body) => mapSessionTemplate(body as BackendSessionTemplate), "The session template could not be created.");
}

export async function templateInput(request: NextRequest) {
  try {
    const value = (await request.json()) as Record<string, unknown>;
    const centreId = stringValue(value.centreId);
    const name = stringValue(value.name);
    const offeredSubjects = subjectInput(value.offeredSubjects);
    const academicYearId = stringValue(value.academicYearId);
    const startTime = stringValue(value.startTime);
    const dayOfWeek = typeof value.dayOfWeek === "number" ? value.dayOfWeek : Number(value.dayOfWeek);
    const bookingDeadlineMinutes = typeof value.bookingDeadlineMinutes === "number" ? value.bookingDeadlineMinutes : Number(value.bookingDeadlineMinutes);
    if (!centreId || !name || !offeredSubjects || !academicYearId || !startTime || !Number.isInteger(dayOfWeek) || !Number.isInteger(bookingDeadlineMinutes)) return null;
    const maximumCapacity = optionalPositiveInteger(value.maximumCapacity);
    if (value.maximumCapacity !== undefined && value.maximumCapacity !== "" && maximumCapacity === undefined) return null;
    return {
      centreId,
      body: {
        name,
        offered_subjects: offeredSubjects,
        academic_year_id: academicYearId,
        day_of_week: dayOfWeek,
        start_time: startTime,
        maximum_capacity: maximumCapacity,
        booking_deadline_minutes: bookingDeadlineMinutes,
      },
    };
  } catch {
    return null;
  }
}

function stringValue(value: unknown) { return typeof value === "string" ? value.trim() : ""; }
function subjectInput(value: unknown) {
  if (!Array.isArray(value) || !value.length || value.length > 50) return null;
  const subjectIDs = new Set<string>();
  const result = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") return null;
    const record = entry as Record<string, unknown>;
    const subjectId = stringValue(record.subjectId);
    if (!subjectId || subjectIDs.has(subjectId) || !Array.isArray(record.tutorProfileIds)) return null;
    const tutorProfileIDs = record.tutorProfileIds.map(stringValue);
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
