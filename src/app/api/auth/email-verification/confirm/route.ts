import type { NextRequest } from "next/server";

import { forwardEmailVerificationConfirmation } from "@/lib/server-account-recovery";

export async function POST(request: NextRequest) {
  return forwardEmailVerificationConfirmation(request);
}
