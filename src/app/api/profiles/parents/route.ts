import { NextRequest } from "next/server";

import { callProtectedBackend } from "@/lib/server-auth";
import { protectedJsonResponse } from "@/lib/server-bff";
import {
  BackendParentProfileList,
  mapParentProfileList,
} from "@/lib/server-profiles";

export async function GET(request: NextRequest) {
  const params = new URLSearchParams();
  const search = request.nextUrl.searchParams.get("search")?.trim();
  const status = request.nextUrl.searchParams.get("status")?.trim();
  if (search) params.set("search", search);
  if (status) params.set("status", status);
  const query = params.size ? `?${params.toString()}` : "";
  const call = await callProtectedBackend(request, `/v1/profiles/parents${query}`, { method: "GET" });
  return protectedJsonResponse(call, (body) => mapParentProfileList(body as BackendParentProfileList));
}
