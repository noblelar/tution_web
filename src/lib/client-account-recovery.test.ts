import assert from "node:assert/strict";
import { test } from "node:test";

// @ts-expect-error -- Node's built-in TypeScript test runner requires the file extension.
import { accountRecoveryTokenPattern, takeAccountRecoveryToken } from "./client-account-recovery.ts";

test("takeAccountRecoveryToken reads the fragment token and immediately removes the fragment", () => {
  const calls: Array<[unknown, string, string]> = [];
  const token = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQ";
  const result = takeAccountRecoveryToken(
    {
      hash: `#token=${token}`,
      pathname: "/reset-password",
      search: "?source=email",
    } as Location,
    {
      state: { existing: true },
      replaceState: (...args: [unknown, string, string]) => calls.push(args),
    } as unknown as History,
  );

  assert.equal(result, token);
  assert.equal(accountRecoveryTokenPattern.test(result), true);
  assert.deepEqual(calls, [[{ existing: true }, "", "/reset-password?source=email"]]);
});

test("takeAccountRecoveryToken returns an empty value but still removes malformed fragments", () => {
  let replacement = "";
  const result = takeAccountRecoveryToken(
    { hash: "#unexpected=value", pathname: "/verify-email", search: "" } as Location,
    {
      state: null,
      replaceState: (_state: unknown, _unused: string, url?: string | URL | null) => {
        replacement = String(url);
      },
    } as History,
  );

  assert.equal(result, "");
  assert.equal(replacement, "/verify-email");
});

test("account recovery tokens use the expected 32-byte base64url representation", () => {
  assert.equal(accountRecoveryTokenPattern.test("a".repeat(43)), true);
  assert.equal(accountRecoveryTokenPattern.test("a".repeat(42)), false);
  assert.equal(accountRecoveryTokenPattern.test(`${"a".repeat(42)}=`), false);
});
