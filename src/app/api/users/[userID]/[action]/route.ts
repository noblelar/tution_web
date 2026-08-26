import { NextRequest, NextResponse } from "next/server";

import { BackendLifecycleResult, mapLifecycleResult } from "@/lib/server-accounts";
import { callProtectedBackend, verifyMutationRequest } from "@/lib/server-auth";
import { protectedJsonResponse } from "@/lib/server-bff";

type RouteParameters = { params: Promise<{ userID: string; action: string }> };
const allowedActions = new Set(["suspend", "restore", "disable"]);

export async function POST(request: NextRequest, context: RouteParameters) {
  if (!verifyMutationRequest(request)) {
    return NextResponse.json({ error: "Request verification failed." }, { status: 403 });
  }
  const { userID, action } = await context.params;
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
