import assert from "node:assert/strict";
import { test } from "node:test";

import { attachBFFGatewayHeader, BFF_GATEWAY_HEADER } from "./backend-gateway";

test("gateway header is absent when the deployment secret is not configured", () => {
  const headers = new Headers();
  attachBFFGatewayHeader(headers, undefined);
  assert.equal(headers.has(BFF_GATEWAY_HEADER), false);
});

test("gateway header is attached only to the server-side backend request", () => {
  const headers = new Headers();
  attachBFFGatewayHeader(headers, "production-gateway-secret");
  assert.equal(headers.get(BFF_GATEWAY_HEADER), "production-gateway-secret");
});
