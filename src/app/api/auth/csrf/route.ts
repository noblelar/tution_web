import { NextResponse } from "next/server";

import { newCsrfToken, setCsrfCookie } from "@/lib/server-auth";

export async function GET() {
  const token = newCsrfToken();
  const response = NextResponse.json({ csrfToken: token });
  response.headers.set("cache-control", "no-store");
  setCsrfCookie(response, token);
  return response;
}
