import { NextRequest, NextResponse } from "next/server";

import {
  BackendAcademicYear,
  BackendAcademicYearList,
  mapAcademicYear,
  mapAcademicYearList,
} from "@/lib/server-academics";
import { callProtectedBackend, verifyMutationRequest } from "@/lib/server-auth";
import { protectedJsonResponse } from "@/lib/server-bff";

export async function GET(request: NextRequest) {
  const centreId = request.nextUrl.searchParams.get("centreId")?.trim();
  if (!centreId) return NextResponse.json({ error: "Management centre is required." }, { status: 400 });
  const call = await callProtectedBackend(request, `/v1/academics/years?centre_id=${encodeURIComponent(centreId)}`, { method: "GET" });
  return protectedJsonResponse(call, (body) => mapAcademicYearList(body as BackendAcademicYearList));
}

export async function POST(request: NextRequest) {
  if (!verifyMutationRequest(request)) return NextResponse.json({ error: "Request verification failed." }, { status: 403 });
  const input = await academicYearInput(request);
  if (!input) return NextResponse.json({ error: "Academic year details are invalid." }, { status: 400 });
  const call = await callProtectedBackend(request, `/v1/academics/years?centre_id=${encodeURIComponent(input.centreId)}`, {
    method: "POST",
    body: JSON.stringify(input.body),
  });
  return protectedJsonResponse(call, (body) => mapAcademicYear(body as BackendAcademicYear));
}

export async function academicYearInput(request: NextRequest) {
  try {
    const input = (await request.json()) as Record<string, unknown>;
    if (
      typeof input.centreId !== "string" || !input.centreId.trim()
      || typeof input.name !== "string"
      || typeof input.startDate !== "string"
      || typeof input.endDate !== "string"
    ) return null;
    return {
      centreId: input.centreId.trim(),
      body: { name: input.name, start_date: input.startDate, end_date: input.endDate },
    };
  } catch { return null; }
}
