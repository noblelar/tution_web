import { NextRequest, NextResponse } from "next/server";

import {
  BackendLifecycleResult,
  BackendManagedAccount,
  mapLifecycleResult,
  mapManagedAccount,
} from "@/lib/server-accounts";
import { callProtectedBackend, verifyMutationRequest } from "@/lib/server-auth";
import { protectedJsonResponse, protectedNoContentResponse } from "@/lib/server-bff";

type RouteParameters = { params: Promise<{ userID: string; action: string }> };
const allowedActions = new Set(["suspend", "restore", "disable"]);

export async function POST(request: NextRequest, context: RouteParameters) {
  if (!verifyMutationRequest(request)) {
    return NextResponse.json({ error: "Request verification failed." }, { status: 403 });
  }
  const { userID, action } = await context.params;
  if (action === "roles") return changeStaffRole(request, userID, "POST");
  if (!allowedActions.has(action)) {
    return NextResponse.json({ error: "Account action is invalid." }, { status: 404 });
  }
  let centreId: string | null = null;
  try {
    const body = (await request.json()) as { centreId?: unknown };
    if (typeof body.centreId === "string" && body.centreId.trim()) centreId = body.centreId;
  } catch {
    // The validation response below is intentionally uniform.
  }
  if (!centreId) return NextResponse.json({ error: "Centre is required." }, { status: 400 });
  const call = await callProtectedBackend(
    request,
    `/v1/users/${encodeURIComponent(userID)}/${action}`,
    { method: "POST", body: JSON.stringify({ centre_id: centreId }) },
  );
  return protectedJsonResponse(call, (body) => mapLifecycleResult(body as BackendLifecycleResult));
}

export async function DELETE(request: NextRequest, context: RouteParameters) {
  if (!verifyMutationRequest(request)) {
    return NextResponse.json({ error: "Request verification failed." }, { status: 403 });
  }
  const { userID, action } = await context.params;
  if (action === "pending-account") {
    const call = await callProtectedBackend(
      request,
      `/v1/users/${encodeURIComponent(userID)}/pending-account`,
      { method: "DELETE" },
    );
    return protectedNoContentResponse(call, "The pending manager account could not be deleted.");
  }
  if (action !== "roles") {
    return NextResponse.json({ error: "Account action is invalid." }, { status: 404 });
  }
  return changeStaffRole(request, userID, "DELETE");
}

async function changeStaffRole(request: NextRequest, userID: string, method: "POST" | "DELETE") {
  let body: { roleKey?: unknown; centreId?: unknown };
  try {
    body = (await request.json()) as { roleKey?: unknown; centreId?: unknown };
  } catch {
    return NextResponse.json({ error: "Role details are required." }, { status: 400 });
  }
  if (
    typeof body.roleKey !== "string" ||
    !body.roleKey.trim() ||
    (body.centreId !== undefined && body.centreId !== null && typeof body.centreId !== "string")
  ) {
    return NextResponse.json({ error: "Role details are invalid." }, { status: 400 });
  }
  const call = await callProtectedBackend(request, `/v1/users/${encodeURIComponent(userID)}/roles`, {
    method,
    body: JSON.stringify({
      role_key: body.roleKey,
      centre_id: typeof body.centreId === "string" && body.centreId.trim() ? body.centreId : undefined,
    }),
  });
  return protectedJsonResponse(call, (result) => mapManagedAccount(result as BackendManagedAccount));
}
