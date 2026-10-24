import "server-only";

import { NextRequest, NextResponse } from "next/server";

import {
  backendErrorMessage,
  callBackend,
  clearSessionCookies,
  verifyMutationRequest,
} from "@/lib/server-auth";
import type {
  AccountRecoveryError,
  AccountRecoveryMessage,
} from "@/types/account-recovery";

type BackendMessage = {
  message?: unknown;
};

type AccountRecoveryRequestKind = "password-reset" | "email-verification";

const rawTokenPattern = /^[A-Za-z0-9_-]{43}$/;
const genericRequestMessage = "If an eligible account exists, an email will be sent.";

const requestBackendPaths: Record<AccountRecoveryRequestKind, string> = {
  "password-reset": "/v1/auth/password-reset/request",
  "email-verification": "/v1/auth/email-verification/request",
};

export async function forwardPasswordResetRequest(
  request: NextRequest,
): Promise<NextResponse<AccountRecoveryMessage | AccountRecoveryError>> {
  return forwardAccountRecoveryRequest(request, "password-reset");
}

export async function forwardEmailVerificationRequest(
  request: NextRequest,
): Promise<NextResponse<AccountRecoveryMessage | AccountRecoveryError>> {
  return forwardAccountRecoveryRequest(request, "email-verification");
}

export async function forwardPasswordResetConfirmation(
  request: NextRequest,
): Promise<NextResponse<AccountRecoveryMessage | AccountRecoveryError>> {
  if (!verifyMutationRequest(request)) return requestVerificationFailure();

  const body = await readObject(request);
  const token = stringValue(body?.token).trim();
  const newPassword = stringValue(body?.newPassword);
  const passwordLength = Array.from(newPassword).length;
  if (
    !rawTokenPattern.test(token) ||
    passwordLength < 15 ||
    passwordLength > 128
  ) {
    return noStore(
      { error: "A valid reset link and a password of 15–128 characters are required." },
      400,
    );
  }

  const response = await forwardConfirmation(
    request,
    "/v1/auth/password-reset/confirm",
    { token, new_password: newPassword },
    "Password reset is temporarily unavailable.",
    "Password reset successfully.",
  );
  if (response.status === 200) clearSessionCookies(response);
  return response;
}

export async function forwardEmailVerificationConfirmation(
  request: NextRequest,
): Promise<NextResponse<AccountRecoveryMessage | AccountRecoveryError>> {
  if (!verifyMutationRequest(request)) return requestVerificationFailure();

  const body = await readObject(request);
  const token = stringValue(body?.token).trim();
  if (!rawTokenPattern.test(token)) {
    return noStore({ error: "A valid email-verification link is required." }, 400);
  }

  return forwardConfirmation(
    request,
    "/v1/auth/email-verification/confirm",
    { token },
    "Email verification is temporarily unavailable.",
    "Email address verified.",
  );
}

async function forwardAccountRecoveryRequest(
  request: NextRequest,
  kind: AccountRecoveryRequestKind,
): Promise<NextResponse<AccountRecoveryMessage | AccountRecoveryError>> {
  if (!verifyMutationRequest(request)) return requestVerificationFailure();

  const body = await readObject(request);
  const email = stringValue(body?.email).trim().toLowerCase();
  if (!email || email.length > 320) {
    return noStore({ error: "Email is required." }, 400);
  }

  let backendResponse: Response;
  try {
    backendResponse = await callBackend(
      requestBackendPaths[kind],
      { method: "POST", body: JSON.stringify({ email }) },
      request,
    );
  } catch {
    return noStore({ error: "Account email service is temporarily unavailable." }, 503);
  }
  if (backendResponse.status !== 202) {
    return noStore({ error: "Account email service is temporarily unavailable." }, 503);
  }

  // The BFF deliberately owns this message so a malformed or changing backend
  // response can never turn this public endpoint into an account-enumeration
  // signal.
  return noStore({ message: genericRequestMessage }, 202);
}

async function forwardConfirmation(
  request: NextRequest,
  backendPath: string,
  body: Record<string, string>,
  fallbackError: string,
  fallbackMessage: string,
): Promise<NextResponse<AccountRecoveryMessage | AccountRecoveryError>> {
  let backendResponse: Response;
  try {
    backendResponse = await callBackend(
      backendPath,
      { method: "POST", body: JSON.stringify(body) },
      request,
    );
  } catch {
    return noStore({ error: fallbackError }, 503);
  }
  if (!backendResponse.ok) {
    const status = backendResponse.status === 400 ? 400 : 503;
    return noStore(
      { error: await backendErrorMessage(backendResponse, fallbackError) },
      status,
    );
  }

  const backendBody = (await backendResponse.json().catch(() => ({}))) as BackendMessage;
  const message =
    typeof backendBody.message === "string" && backendBody.message.trim()
      ? backendBody.message
      : fallbackMessage;
  return noStore({ message }, 200);
}

async function readObject(request: NextRequest): Promise<Record<string, unknown> | null> {
  try {
    const body: unknown = await request.json();
    return typeof body === "object" && body !== null
      ? (body as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function requestVerificationFailure(): NextResponse<AccountRecoveryError> {
  return noStore({ error: "Request verification failed." }, 403);
}

function noStore<T extends AccountRecoveryMessage | AccountRecoveryError>(
  body: T,
  status: number,
): NextResponse<T> {
  return NextResponse.json(body, {
    status,
    headers: { "cache-control": "no-store" },
  });
}
