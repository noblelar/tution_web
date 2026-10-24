export async function csrfMutation(
  path: string,
  body: Record<string, string>,
  fetcher: typeof fetch = fetch,
): Promise<Response> {
  if (!path.startsWith("/api/") || path.startsWith("//")) {
    throw new Error("CSRF mutations must use a same-origin API path");
  }

  const csrfResponse = await fetcher("/api/auth/csrf", {
    cache: "no-store",
    credentials: "same-origin",
  });
  if (!csrfResponse.ok) throw new Error("CSRF token unavailable");

  const csrfBody = (await csrfResponse.json().catch(() => ({}))) as {
    csrfToken?: unknown;
  };
  if (typeof csrfBody.csrfToken !== "string" || !csrfBody.csrfToken) {
    throw new Error("CSRF token unavailable");
  }

  return fetcher(path, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-csrf-token": csrfBody.csrfToken,
    },
    body: JSON.stringify(body),
    cache: "no-store",
    credentials: "same-origin",
  });
}
