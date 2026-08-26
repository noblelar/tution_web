import { NextRequest, NextResponse } from "next/server";

import {
  BackendManagedAccount,
  BackendProvisionResult,
  mapManagedAccount,
  mapProvisionResult,
} from "@/lib/server-accounts";
import { callProtectedBackend, verifyMutationRequest } from "@/lib/server-auth";
import { protectedJsonResponse } from "@/lib/server-bff";

export async function GET(request: NextRequest) {
  const centreId = request.nextUrl.searchParams.get("centreId")?.trim();
  const query = centreId ? `?centre_id=${encodeURIComponent(centreId)}` : "";
  const call = await callProtectedBackend(request, `/v1/users${query}`, { method: "GET" });
  return protectedJsonResponse(call, (body) => ({
    accounts: ((body as { accounts?: BackendManagedAccount[] }).accounts ?? []).map(mapManagedAccount),
  }));
}

export async function POST(request: NextRequest) {
  if (!verifyMutationRequest(request)) {
    return NextResponse.json({ error: "Request verification failed." }, { status: 403 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Account details are required." }, { status: 400 });
  }
  const input = body as Record<string, unknown>;
  if (
    !input ||
    typeof input.firstName !== "string" ||
    typeof input.lastName !== "string" ||
    typeof input.email !== "string" ||
    typeof input.centreId !== "string" ||
    !Array.isArray(input.roleKeys) ||
    !input.roleKeys.every((role) => typeof role === "string")
  ) {
    return NextResponse.json({ error: "Account details are invalid." }, { status: 400 });
  }
  const backendBody = {
    first_name: input.firstName,
    last_name: input.lastName,
    email: input.email,
    phone_number: typeof input.phoneNumber === "string" && input.phoneNumber.trim() ? input.phoneNumber : undefined,
    centre_id: input.centreId,
    role_keys: input.roleKeys,
  };
  const call = await callProtectedBackend(request, "/v1/users", {
    method: "POST",
    body: JSON.stringify(backendBody),
  });
  return protectedJsonResponse(call, (result) => mapProvisionResult(result as BackendProvisionResult));
}
