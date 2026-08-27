import { NextRequest, NextResponse } from "next/server";

import { BackendAcademicYear, mapAcademicYear } from "@/lib/server-academics";
import { callProtectedBackend, verifyMutationRequest } from "@/lib/server-auth";
import { protectedJsonResponse } from "@/lib/server-bff";

type RouteContext = { params: Promise<{ yearID: string; action: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  if (!verifyMutationRequest(request)) return NextResponse.json({ error: "Request verification failed." }, { status: 403 });
  const { yearID, action } = await context.params;
  if (action !== "activate" && action !== "close") return NextResponse.json({ error: "Academic year action is invalid." }, { status: 404 });
  let input: { centreId?: unknown };
  try { input = (await request.json()) as typeof input; } catch { return NextResponse.json({ error: "Management centre is required." }, { status: 400 }); }
  if (typeof input.centreId !== "string" || !input.centreId.trim()) return NextResponse.json({ error: "Management centre is required." }, { status: 400 });
  const call = await callProtectedBackend(request, `/v1/academics/years/${encodeURIComponent(yearID)}/${action}?centre_id=${encodeURIComponent(input.centreId)}`, {
    method: "POST",
  });
  return protectedJsonResponse(call, (body) => mapAcademicYear(body as BackendAcademicYear));
}
