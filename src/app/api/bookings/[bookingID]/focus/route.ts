import { NextRequest, NextResponse } from "next/server";

import { lessonFocusCharacterCount, lessonFocusMaximumLength } from "@/lib/booking-rules";
import { callProtectedBackend, verifyMutationRequest } from "@/lib/server-auth";
import { protectedJsonResponse } from "@/lib/server-bff";
import { BackendSessionBooking, mapSessionBooking } from "@/lib/server-bookings";

type RouteContext = { params: Promise<{ bookingID: string }> };

export async function PUT(request: NextRequest, context: RouteContext) {
  if (!verifyMutationRequest(request)) return NextResponse.json({ error: "Request verification failed." }, { status: 403 });
  let lessonFocus = "";
  try {
    const input = (await request.json()) as Record<string, unknown>;
    if (typeof input.lessonFocus !== "string") throw new Error("invalid focus");
    lessonFocus = input.lessonFocus.trim();
  } catch {
    return NextResponse.json({ error: "Lesson focus is invalid." }, { status: 400 });
  }
  if (lessonFocusCharacterCount(lessonFocus) > lessonFocusMaximumLength) return NextResponse.json({ error: `Lesson focus must be ${lessonFocusMaximumLength} characters or fewer.` }, { status: 400 });
  const { bookingID } = await context.params;
  const call = await callProtectedBackend(request, `/v1/bookings/${encodeURIComponent(bookingID)}/focus`, { method: "PUT", body: JSON.stringify({ lesson_focus: lessonFocus }) });
  return protectedJsonResponse(call, (body) => mapSessionBooking(body as BackendSessionBooking), "The lesson focus could not be updated.");
}
