import { NextRequest } from "next/server";

import { callProtectedBackend } from "@/lib/server-auth";
import { protectedJsonResponse } from "@/lib/server-bff";
import {
  type BackendNotificationList,
  mapNotificationList,
} from "@/lib/server-notifications";

export async function GET(request: NextRequest) {
  const call = await callProtectedBackend(request, "/v1/notifications", { method: "GET" });
  return protectedJsonResponse(
    call,
    (body) => mapNotificationList(body as BackendNotificationList),
    "Notifications could not be loaded.",
  );
}

