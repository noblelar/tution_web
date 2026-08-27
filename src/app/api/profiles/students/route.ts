import { NextRequest } from "next/server";

import { callProtectedBackend } from "@/lib/server-auth";
import { protectedJsonResponse } from "@/lib/server-bff";
import {
  BackendStudentProfileList,
  mapStudentProfileList,
} from "@/lib/server-profiles";

export async function GET(request: NextRequest) {
  const params = new URLSearchParams();
  const search = request.nextUrl.searchParams.get("search")?.trim();
  const status = request.nextUrl.searchParams.get("status")?.trim();
  const peopleCodeLoginEnabled = request.nextUrl.searchParams.get("peopleCodeLoginEnabled")?.trim();
  const withoutEmail = request.nextUrl.searchParams.get("withoutEmail")?.trim();

  if (search) params.set("search", search);
  if (status) params.set("status", status);
  if (peopleCodeLoginEnabled) params.set("people_code_login_enabled", peopleCodeLoginEnabled);
  if (withoutEmail) params.set("without_email", withoutEmail);

  const query = params.size ? `?${params.toString()}` : "";
  const call = await callProtectedBackend(request, `/v1/profiles/students${query}`, { method: "GET" });
  return protectedJsonResponse(call, (body) => mapStudentProfileList(body as BackendStudentProfileList));
}
