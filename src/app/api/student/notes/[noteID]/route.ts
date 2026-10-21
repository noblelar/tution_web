import { NextRequest, NextResponse } from "next/server";

import { callProtectedBackend, verifyMutationRequest } from "@/lib/server-auth";
import { protectedJsonResponse, protectedNoContentResponse } from "@/lib/server-bff";
import { mapStudentLearningNote, studentNoteMutationInput } from "@/lib/server-student-notes";

type RouteContext = { params: Promise<{ noteID: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const path = await notePath(context);
  const call = await callProtectedBackend(request, path, { method: "GET" });
  return protectedJsonResponse(call, mapStudentLearningNote, "Your note could not be loaded.");
}

export async function PUT(request: NextRequest, context: RouteContext) {
  if (!verifyMutationRequest(request)) {
    return NextResponse.json({ error: "Request verification failed." }, { status: 403 });
  }
  const input = await studentNoteMutationInput(request);
  if (!input) return NextResponse.json({ error: "Reflection details are invalid." }, { status: 400 });
  const path = await notePath(context);
  const call = await callProtectedBackend(request, path, {
    method: "PUT",
    body: JSON.stringify(input),
  });
  return protectedJsonResponse(call, mapStudentLearningNote, "Your reflection could not be updated.");
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  if (!verifyMutationRequest(request)) {
    return NextResponse.json({ error: "Request verification failed." }, { status: 403 });
  }
  const path = await notePath(context);
  const call = await callProtectedBackend(request, path, { method: "DELETE" });
  return protectedNoContentResponse(call, "Your reflection could not be deleted.");
}

async function notePath(context: RouteContext): Promise<string> {
  const { noteID } = await context.params;
  return `/v1/student/notes/${encodeURIComponent(noteID)}`;
}
