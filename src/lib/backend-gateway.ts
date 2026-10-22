export const BFF_GATEWAY_HEADER = "x-tution-gateway-key";

export function attachBFFGatewayHeader(headers: Headers, secret: string | undefined): void {
  if (secret) {
    headers.set(BFF_GATEWAY_HEADER, secret);
  }
}
