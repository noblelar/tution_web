import type { NextRequest } from "next/server";

import { forwardEmailVerificationRequest } from "@/lib/server-account-recovery";

export async function POST(request: NextRequest) {
  return forwardEmailVerificationRequest(request);
}
