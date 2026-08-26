import { NextResponse } from "next/server";

import {
  BackendAlternativeMethods,
  mapAlternativeMethods,
} from "@/lib/server-alternative-auth";
import { callBackend } from "@/lib/server-auth";

export async function GET() {
  const backendResponse = await callBackend("/v1/auth/methods", { method: "GET" });
  if (!backendResponse.ok) {
    return NextResponse.json(
      { google: false, apple: false, emailOtp: false },
      { status: 503, headers: { "cache-control": "no-store" } },
    );
  }
  const methods = (await backendResponse.json()) as BackendAlternativeMethods;
  return NextResponse.json(mapAlternativeMethods(methods), {
    headers: { "cache-control": "no-store" },
  });
}
