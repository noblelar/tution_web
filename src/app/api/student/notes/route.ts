import { NextRequest, NextResponse } from "next/server";

import { callProtectedBackend, verifyMutationRequest } from "@/lib/server-auth";
import { protectedJsonResponse } from "@/lib/server-bff";
import {
  mapStudentLearningNote,
  mapStudentLearningNoteList,
  studentNoteBackendListPath,
  studentNoteMutationInput,
} from "@/lib/server-student-notes";

export async function GET(request: NextRequest) {
  const path = studentNoteBackendListPath(request.nextUrl);
  if (!path) return NextResponse.json({ error: "Note filters are invalid." }, { status: 400 });
  const call = await callProtectedBackend(request, path, { method: "GET" });
  return protectedJsonResponse(call, mapStudentLearningNoteList, "Your notes could not be loaded right now.");
}

export async function POST(request: NextRequest) {
  if (!verifyMutationRequest(request)) {
    return NextResponse.json({ error: "Request verification failed." }, { status: 403 });
  }
  const input = await studentNoteMutationInput(request);
  if (!input) return NextResponse.json({ error: "Reflection details are invalid." }, { status: 400 });
  const call = await callProtectedBackend(request, "/v1/student/notes", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return protectedJsonResponse(call, mapStudentLearningNote, "Your reflection could not be saved.");
}
