import type { NextRequest } from "next/server";

import { forwardPasswordResetConfirmation } from "@/lib/server-account-recovery";

export async function POST(request: NextRequest) {
  return forwardPasswordResetConfirmation(request);
}
