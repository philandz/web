/**
 * Returns a display-safe name string. Falls back to a localized
 * "Anonymous" placeholder when the input is empty, undefined, or
 * contains only whitespace. Used wherever a user-provided name is
 * rendered in the UI to keep avatars and labels consistent.
 */
export function safeDisplayName(name: string | null | undefined): string {
  if (name == null) return "Anonymous";
  const trimmed = name.trim();
  return trimmed.length > 0 ? trimmed : "Anonymous";
}
