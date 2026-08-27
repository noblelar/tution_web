import { NextRequest, NextResponse } from "next/server";

import {
  BackendSubject,
  BackendSubjectList,
  mapSubject,
  mapSubjectList,
} from "@/lib/server-academics";
import { callProtectedBackend, verifyMutationRequest } from "@/lib/server-auth";
import { protectedJsonResponse } from "@/lib/server-bff";

export async function GET(request: NextRequest) {
  const centreId = request.nextUrl.searchParams.get("centreId")?.trim();
  if (!centreId) return NextResponse.json({ error: "Management centre is required." }, { status: 400 });
  const call = await callProtectedBackend(request, `/v1/academics/subjects?centre_id=${encodeURIComponent(centreId)}`, { method: "GET" });
  return protectedJsonResponse(call, (body) => mapSubjectList(body as BackendSubjectList));
}

export async function POST(request: NextRequest) {
  if (!verifyMutationRequest(request)) return NextResponse.json({ error: "Request verification failed." }, { status: 403 });
  const input = await subjectInput(request);
  if (!input) return NextResponse.json({ error: "Subject details are invalid." }, { status: 400 });
  const call = await callProtectedBackend(request, `/v1/academics/subjects?centre_id=${encodeURIComponent(input.centreId)}`, { method: "POST", body: JSON.stringify(input.body) });
  return protectedJsonResponse(call, (body) => mapSubject(body as BackendSubject));
}

export async function subjectInput(request: NextRequest) {
  try {
    const input = (await request.json()) as Record<string, unknown>;
    if (typeof input.centreId !== "string" || typeof input.name !== "string" || typeof input.code !== "string" || typeof input.displayOrder !== "number" || !Number.isInteger(input.displayOrder)) return null;
    if (input.description !== undefined && typeof input.description !== "string") return null;
    return { centreId: input.centreId.trim(), body: { name: input.name, code: input.code, description: input.description || undefined, display_order: input.displayOrder } };
  } catch { return null; }
}
