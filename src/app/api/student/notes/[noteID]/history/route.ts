import { NextRequest } from "next/server";

import { callProtectedBackend } from "@/lib/server-auth";
import { protectedJsonResponse } from "@/lib/server-bff";
import { mapStudentLearningNoteRevisionList } from "@/lib/server-student-notes";

type RouteContext = { params: Promise<{ noteID: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const { noteID } = await context.params;
  const call = await callProtectedBackend(
    request,
    `/v1/student/notes/${encodeURIComponent(noteID)}/history`,
    { method: "GET" },
  );
  return protectedJsonResponse(call, mapStudentLearningNoteRevisionList, "Your note history could not be loaded.");
}
