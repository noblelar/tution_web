import { NextRequest, NextResponse } from "next/server";

import { callProtectedBackend, verifyMutationRequest } from "@/lib/server-auth";
import { protectedJsonResponse } from "@/lib/server-bff";
import { BackendCreditMutationResult, mapCreditMutation } from "@/lib/server-credits";

export async function POST(request: NextRequest) {
  if (!verifyMutationRequest(request)) return NextResponse.json({ error: "Request verification failed." }, { status: 403 });
  let input: Record<string, unknown>;
  try { input = (await request.json()) as Record<string, unknown>; }
  catch { return NextResponse.json({ error: "Credit award details are required." }, { status: 400 }); }
  const centreId = text(input.centreId);
  const parentProfileId = text(input.parentProfileId);
  const paymentMethod = text(input.paymentMethod);
  const credits = typeof input.credits === "number" ? input.credits : Number(input.credits);
  if (!centreId || !parentProfileId || !Number.isInteger(credits) || credits < 1 || !["cash", "bank_transfer", "other"].includes(paymentMethod)) {
    return NextResponse.json({ error: "Credit award details are invalid." }, { status: 400 });
  }
  const call = await callProtectedBackend(request, "/v1/credits/awards", {
    method: "POST",
    body: JSON.stringify({ centre_id: centreId, parent_profile_id: parentProfileId, credits, payment_method: paymentMethod, payment_reference: optionalText(input.paymentReference), note: optionalText(input.note) }),
  });
  return protectedJsonResponse(call, (body) => mapCreditMutation(body as BackendCreditMutationResult), "Credits could not be awarded.");
}

function text(value: unknown) { return typeof value === "string" ? value.trim() : ""; }
function optionalText(value: unknown) { return text(value) || undefined; }
