import { NextRequest, NextResponse } from "next/server";

import {
  BackendAcademicLevel,
  BackendAcademicLevelList,
  mapAcademicLevel,
  mapAcademicLevelList,
} from "@/lib/server-academics";
import { callProtectedBackend, verifyMutationRequest } from "@/lib/server-auth";
import { protectedJsonResponse } from "@/lib/server-bff";

export async function GET(request: NextRequest) {
  const centreId = request.nextUrl.searchParams.get("centreId")?.trim();
  if (!centreId) return NextResponse.json({ error: "Management centre is required." }, { status: 400 });
  const call = await callProtectedBackend(request, `/v1/academics/levels?centre_id=${encodeURIComponent(centreId)}`, { method: "GET" });
  return protectedJsonResponse(call, (body) => mapAcademicLevelList(body as BackendAcademicLevelList));
}

export async function POST(request: NextRequest) {
  if (!verifyMutationRequest(request)) return NextResponse.json({ error: "Request verification failed." }, { status: 403 });
  const input = await academicLevelInput(request);
  if (!input) return NextResponse.json({ error: "Academic level details are invalid." }, { status: 400 });
  const call = await callProtectedBackend(request, `/v1/academics/levels?centre_id=${encodeURIComponent(input.centreId)}`, {
    method: "POST",
    body: JSON.stringify(input.body),
  });
  return protectedJsonResponse(call, (body) => mapAcademicLevel(body as BackendAcademicLevel));
}

export async function academicLevelInput(request: NextRequest) {
  try {
    const input = (await request.json()) as Record<string, unknown>;
    if (typeof input.centreId !== "string" || typeof input.name !== "string" || typeof input.displayOrder !== "number" || !Number.isInteger(input.displayOrder)) return null;
    if (input.description !== undefined && typeof input.description !== "string") return null;
    return {
      centreId: input.centreId.trim(),
      body: { name: input.name, description: input.description || undefined, display_order: input.displayOrder },
    };
  } catch { return null; }
}
