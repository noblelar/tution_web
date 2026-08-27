import { NextRequest, NextResponse } from "next/server";

import { academicYearInput } from "../route";
import { BackendAcademicYear, mapAcademicYear } from "@/lib/server-academics";
import { callProtectedBackend, verifyMutationRequest } from "@/lib/server-auth";
import { protectedJsonResponse } from "@/lib/server-bff";

type RouteContext = { params: Promise<{ yearID: string }> };

export async function PUT(request: NextRequest, context: RouteContext) {
  if (!verifyMutationRequest(request)) return NextResponse.json({ error: "Request verification failed." }, { status: 403 });
  const input = await academicYearInput(request);
  if (!input) return NextResponse.json({ error: "Academic year details are invalid." }, { status: 400 });
  const { yearID } = await context.params;
  const call = await callProtectedBackend(request, `/v1/academics/years/${encodeURIComponent(yearID)}?centre_id=${encodeURIComponent(input.centreId)}`, {
    method: "PUT",
    body: JSON.stringify(input.body),
  });
  return protectedJsonResponse(call, (body) => mapAcademicYear(body as BackendAcademicYear));
}
