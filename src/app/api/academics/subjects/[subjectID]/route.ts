import { NextRequest, NextResponse } from "next/server";

import { subjectInput } from "../route";
import { BackendSubject, mapSubject } from "@/lib/server-academics";
import { callProtectedBackend, verifyMutationRequest } from "@/lib/server-auth";
import { protectedJsonResponse } from "@/lib/server-bff";

type RouteContext = { params: Promise<{ subjectID: string }> };

export async function PUT(request: NextRequest, context: RouteContext) {
  if (!verifyMutationRequest(request)) return NextResponse.json({ error: "Request verification failed." }, { status: 403 });
  const input = await subjectInput(request);
  if (!input) return NextResponse.json({ error: "Subject details are invalid." }, { status: 400 });
  const { subjectID } = await context.params;
  const call = await callProtectedBackend(request, `/v1/academics/subjects/${encodeURIComponent(subjectID)}?centre_id=${encodeURIComponent(input.centreId)}`, { method: "PUT", body: JSON.stringify(input.body) });
  return protectedJsonResponse(call, (body) => mapSubject(body as BackendSubject));
}
