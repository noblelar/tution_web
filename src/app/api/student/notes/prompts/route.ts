import { NextRequest } from "next/server";

import { callProtectedBackend } from "@/lib/server-auth";
import { protectedJsonResponse } from "@/lib/server-bff";
import { mapStudentReflectionPromptState } from "@/lib/server-student-notes";

export async function GET(request: NextRequest) {
  const call = await callProtectedBackend(request, "/v1/student/notes/prompts", { method: "GET" });
  return protectedJsonResponse(call, mapStudentReflectionPromptState, "Your learning reminder could not be checked.");
}
