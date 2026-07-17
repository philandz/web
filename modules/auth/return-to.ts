/**
 * Sanitize a `return_to` query param into a safe in-app path.
 *
 * Returns `null` for any value that should be ignored:
 *   - missing / empty
 *   - not a string
 *   - absolute URL (contains a scheme like `https:`)
 *   - protocol-relative URL (starts with `//`)
 *   - anything that does not start with a single `/`
 *
 * Otherwise returns the trimmed value as-is. Callers are responsible
 * for locale-prefixing when needed (this helper only enforces shape).
 */
export function sanitizeReturnTo(raw: string | null | undefined): string | null {
  if (typeof raw !== "string") return null;

  const value = raw.trim();
  if (!value) return null;

  // Must be an in-app absolute path.
  if (!value.startsWith("/")) return null;
  // Block protocol-relative URLs (e.g. //evil.com/x).
  if (value.startsWith("//")) return null;
  // Block scheme-bearing absolute URLs that may have slipped through.
  if (value.includes("://")) return null;

  return value;
}