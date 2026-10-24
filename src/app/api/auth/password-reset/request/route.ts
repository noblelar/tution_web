import type { NextRequest } from "next/server";

import { forwardPasswordResetRequest } from "@/lib/server-account-recovery";

export async function POST(request: NextRequest) {
  return forwardPasswordResetRequest(request);
}
