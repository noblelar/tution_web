import { NextRequest, NextResponse } from "next/server";

import { academicLevelInput } from "../route";
import { BackendAcademicLevel, mapAcademicLevel } from "@/lib/server-academics";
import { callProtectedBackend, verifyMutationRequest } from "@/lib/server-auth";
import { protectedJsonResponse } from "@/lib/server-bff";

type RouteContext = { params: Promise<{ levelID: string }> };

export async function PUT(request: NextRequest, context: RouteContext) {
  if (!verifyMutationRequest(request)) return NextResponse.json({ error: "Request verification failed." }, { status: 403 });
  const input = await academicLevelInput(request);
  if (!input) return NextResponse.json({ error: "Academic level details are invalid." }, { status: 400 });
  const { levelID } = await context.params;
  const call = await callProtectedBackend(request, `/v1/academics/levels/${encodeURIComponent(levelID)}?centre_id=${encodeURIComponent(input.centreId)}`, {
    method: "PUT",
    body: JSON.stringify(input.body),
  });
  return protectedJsonResponse(call, (body) => mapAcademicLevel(body as BackendAcademicLevel));
}
