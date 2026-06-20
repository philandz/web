/**
 * Guest session token storage for the sharing service.
 *
 * Account-free participants authenticate via an opaque session token
 * (32 random bytes, URL-safe base64) returned once at join and stored
 * in localStorage. The token is keyed by `budget_id` because a single
 * user may join multiple sharing budgets and each has its own token.
 *
 * The token is used by the web app to authenticate sharing API calls
 * via the `Authorization: SharingSession <token>` header, which the
 * gateway translates to gRPC `x-session-token` metadata for the
 * sharing service to hash and look up.
 *
 * The web app reads `useAuthStore.token` first (the JWT path for
 * Normal Users). When there is no JWT — or when the request path
 * begins with `/api/sharing/` and the budget has a stored guest
 * session — the guest token takes precedence on sharing routes.
 */

const STORAGE_KEY_PREFIX = "philandz_sharing_session_";

function keyFor(budgetId: string): string {
  return `${STORAGE_KEY_PREFIX}${budgetId}`;
}

/**
 * Read the stored guest session token for a budget. Returns null if
 * none is stored (the user has not joined as a guest on this device).
 */
export function readSharingSession(budgetId: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(keyFor(budgetId));
  } catch {
    return null;
  }
}

/**
 * Persist a guest session token. Called immediately after a successful
 * `acceptJoinLink` server response, with the raw token from the
 * response body. The token is the only copy — the server only stores
 * the SHA-256 hash.
 */
export function writeSharingSession(budgetId: string, token: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(keyFor(budgetId), token);
  } catch {
    // ignore quota / privacy errors
  }
}

/**
 * Clear the stored guest session token. Called on "Leave budget" or
 * when the server returns 401 for a guest request (the token has
 * been revoked or the participant removed).
 */
export function clearSharingSession(budgetId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(keyFor(budgetId));
  } catch {
    // ignore
  }
}

/**
 * Extract the budget_id from a sharing API path. Returns null if the
 * path is not a sharing path, or the budget id is not present.
 *
 *   /api/sharing/budgets/<id>/expenses  -> "<id>"
 *   /api/sharing/join-link/accept        -> null
 *   /api/budget/budgets/<id>             -> null
 */
export function extractBudgetIdFromPath(path: string): string | null {
  if (!path.startsWith("/api/sharing/budgets/")) return null;
  const rest = path.slice("/api/sharing/budgets/".length);
  const slash = rest.indexOf("/");
  if (slash < 0) return rest || null;
  return rest.slice(0, slash) || null;
}
