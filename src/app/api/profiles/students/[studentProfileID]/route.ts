import { NextRequest } from "next/server";

import { callProtectedBackend } from "@/lib/server-auth";
import { protectedJsonResponse } from "@/lib/server-bff";
import { BackendStudentProfile, mapStudentProfile } from "@/lib/server-profiles";

type RouteContext = {
  params: Promise<{ studentProfileID: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const { studentProfileID } = await context.params;
  const call = await callProtectedBackend(
    request,
    `/v1/profiles/students/${encodeURIComponent(studentProfileID)}`,
    { method: "GET" },
  );
  return protectedJsonResponse(call, (body) => mapStudentProfile(body as BackendStudentProfile));
}
