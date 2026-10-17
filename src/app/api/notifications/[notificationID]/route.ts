import { NextRequest, NextResponse } from "next/server";

import { callProtectedBackend, verifyMutationRequest } from "@/lib/server-auth";
import { protectedJsonResponse } from "@/lib/server-bff";
import {
  type BackendInAppNotification,
  mapNotification,
} from "@/lib/server-notifications";

type RouteContext = { params: Promise<{ notificationID: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  if (!verifyMutationRequest(request)) {
    return NextResponse.json({ error: "Request verification failed." }, { status: 403 });
  }
  const operation = request.nextUrl.searchParams.get("operation");
  if (operation !== "read" && operation !== "dismiss") {
    return NextResponse.json({ error: "Notification operation is invalid." }, { status: 400 });
  }
  const { notificationID } = await context.params;
  const call = await callProtectedBackend(
    request,
    `/v1/notifications/${encodeURIComponent(notificationID)}/${operation}`,
    { method: "POST", body: JSON.stringify({}) },
  );
  return protectedJsonResponse(
    call,
    (body) => mapNotification(body as BackendInAppNotification),
    operation === "dismiss"
      ? "The notification could not be dismissed."
      : "The notification could not be marked as read.",
  );
}

