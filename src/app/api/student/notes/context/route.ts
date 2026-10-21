import { NextRequest } from "next/server";

import { callProtectedBackend } from "@/lib/server-auth";
import { protectedJsonResponse } from "@/lib/server-bff";
import { mapStudentNotesContext } from "@/lib/server-student-notes";

export async function GET(request: NextRequest) {
  const call = await callProtectedBackend(request, "/v1/student/notes/context", { method: "GET" });
  return protectedJsonResponse(call, mapStudentNotesContext, "Your note options could not be loaded right now.");
}
