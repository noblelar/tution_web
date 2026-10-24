import assert from "node:assert/strict";
import { test } from "node:test";

// @ts-expect-error -- Node's built-in TypeScript test runner requires the file extension.
import { csrfMutation } from "./client-auth.ts";

test("csrfMutation obtains a CSRF token and performs only a same-origin no-store mutation", async () => {
  const calls: Array<{ input: string; init?: RequestInit }> = [];
  const fetcher: typeof fetch = async (input, init) => {
    calls.push({ input: String(input), init });
    if (calls.length === 1) return Response.json({ csrfToken: "csrf-token" });
    return Response.json({ message: "accepted" }, { status: 202 });
  };

  const response = await csrfMutation(
    "/api/auth/password-reset/request",
    { email: "person@example.com" },
    fetcher,
  );

  assert.equal(response.status, 202);
  assert.equal(calls.length, 2);
  assert.equal(calls[0].input, "/api/auth/csrf");
  assert.equal(calls[0].init?.cache, "no-store");
  assert.equal(calls[0].init?.credentials, "same-origin");
  assert.equal(calls[1].input, "/api/auth/password-reset/request");
  assert.equal(calls[1].init?.method, "POST");
  assert.equal(calls[1].init?.cache, "no-store");
  assert.equal(calls[1].init?.credentials, "same-origin");
  assert.equal(new Headers(calls[1].init?.headers).get("x-csrf-token"), "csrf-token");
  assert.equal(calls[1].init?.body, JSON.stringify({ email: "person@example.com" }));
});

test("csrfMutation refuses non-API and protocol-relative destinations", async () => {
  let fetchCalls = 0;
  const fetcher: typeof fetch = async () => {
    fetchCalls++;
    return Response.json({ csrfToken: "csrf-token" });
  };

  await assert.rejects(
    csrfMutation("https://example.com/api/reset", {}, fetcher),
    /same-origin API path/,
  );
  await assert.rejects(
    csrfMutation("//example.com/api/reset", {}, fetcher),
    /same-origin API path/,
  );
  assert.equal(fetchCalls, 0);
});

test("csrfMutation stops when the CSRF response is unavailable or malformed", async () => {
  for (const csrfResponse of [
    new Response(null, { status: 503 }),
    Response.json({ csrfToken: "" }),
    Response.json({}),
  ]) {
    let fetchCalls = 0;
    const fetcher: typeof fetch = async () => {
      fetchCalls++;
      return csrfResponse.clone();
    };

    await assert.rejects(
      csrfMutation("/api/auth/email-verification/request", {}, fetcher),
      /CSRF token unavailable/,
    );
    assert.equal(fetchCalls, 1);
  }
});
