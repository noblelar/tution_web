import { NextRequest, NextResponse } from "next/server";

import { callProtectedBackend, verifyMutationRequest } from "@/lib/server-auth";
import { protectedJsonResponse } from "@/lib/server-bff";
import { BackendSession, mapSession } from "@/lib/server-sessions";

type RouteContext = { params: Promise<{ sessionID: string; sessionSubjectID: string }> };

export async function PUT(request: NextRequest, context: RouteContext) {
  if (!verifyMutationRequest(request)) return NextResponse.json({ error: "Request verification failed." }, { status: 403 });

  let centreId = "";
  let tutorProfileIDs: string[] = [];
  try {
    const body = (await request.json()) as Record<string, unknown>;
    centreId = typeof body.centreId === "string" ? body.centreId.trim() : "";
    if (!Array.isArray(body.tutorProfileIds) || body.tutorProfileIds.length > 20) throw new Error("invalid tutor list");
    tutorProfileIDs = body.tutorProfileIds.map((value) => typeof value === "string" ? value.trim() : "");
  } catch {
    return NextResponse.json({ error: "Subject tutor assignment is invalid." }, { status: 400 });
  }
  if (!centreId || tutorProfileIDs.some((id) => !id) || new Set(tutorProfileIDs).size !== tutorProfileIDs.length) {
    return NextResponse.json({ error: "Subject tutor assignment is invalid." }, { status: 400 });
  }

  const { sessionID, sessionSubjectID } = await context.params;
  const call = await callProtectedBackend(
    request,
    `/v1/sessions/${encodeURIComponent(sessionID)}/subjects/${encodeURIComponent(sessionSubjectID)}/tutors?centre_id=${encodeURIComponent(centreId)}`,
    { method: "PUT", body: JSON.stringify({ tutor_profile_ids: tutorProfileIDs }) },
  );
  return protectedJsonResponse(call, (body) => mapSession(body as BackendSession), "The subject tutor assignment could not be updated.");
}
