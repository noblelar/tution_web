export const accountRecoveryTokenPattern = /^[A-Za-z0-9_-]{43}$/;

type FragmentLocation = Pick<Location, "hash" | "pathname" | "search">;
type FragmentHistory = Pick<History, "replaceState" | "state">;

export function takeAccountRecoveryToken(
  location: FragmentLocation = window.location,
  history: FragmentHistory = window.history,
): string {
  const token = new URLSearchParams(location.hash.slice(1)).get("token")?.trim() ?? "";
  history.replaceState(
    history.state,
    "",
    `${location.pathname}${location.search}`,
  );
  return token;
}
