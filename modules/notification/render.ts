import type { InboxItem } from "@/services/notification-service";

/** The slice of next-intl's translator we need (keeps this file unit-testable). */
export interface Translator {
  (key: string, values?: Record<string, string | number>): string;
  has(key: string): boolean;
}

export interface RenderedNotification {
  title: string;
  body: string;
}

/** "debt.payment_due" -> "debt_payment_due" (next-intl keys cannot contain dots). */
export function typeKey(type: string): string {
  return type.replace(/[^a-zA-Z0-9]+/g, "_");
}

function scalarParams(params: Record<string, unknown>): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  for (const [k, v] of Object.entries(params)) {
    if (typeof v === "string" || typeof v === "number") out[k] = v;
    else if (typeof v === "boolean") out[k] = v ? "true" : "false";
  }
  return out;
}

const ROLES = new Set(["owner", "manager", "contributor", "viewer"]);

/**
 * Message values: the producer's params plus what the messages may always rely on —
 * `actor_name` (from the inbox lookup when the producer did not send one), a readable
 * `entry_description` and a translated `role_label`.
 */
export function templateValues(t: Translator, item: InboxItem): Record<string, string | number> {
  const values = scalarParams(item.params);
  const text = (k: string) => (typeof values[k] === "string" ? (values[k] as string).trim() : "");
  const role = text("role").toLowerCase();
  return {
    ...values,
    count: item.groupCount,
    actor_name: text("actor_name") || item.actorName || t("someone"),
    entry_description: text("entry_description") || t("aTransaction"),
    role_label: ROLES.has(role) ? t(`roles.${role}`) : role,
  };
}

/**
 * Personal notifications are rendered client-side from `type` + `params` through the
 * `notification.types.<type>` messages; unknown types (a newer producer than this web build)
 * and messages that fail to format fall back to the producer's `fallbackText`.
 * System broadcasts already carry their title/body in the caller's locale.
 */
export function renderNotification(t: Translator, item: InboxItem): RenderedNotification {
  if (item.kind === "system") {
    return { title: item.title, body: item.body };
  }
  const base = `types.${typeKey(item.type)}`;
  if (t.has(`${base}.title`)) {
    try {
      const values = templateValues(t, item);
      const groupedKey = `${base}.grouped`;
      const title =
        item.groupCount > 1 && t.has(groupedKey) ? t(groupedKey, values) : t(`${base}.title`, values);
      const body = t.has(`${base}.body`) ? t(`${base}.body`, values) : "";
      return { title, body };
    } catch {
      // fall through to the fallback text
    }
  }
  return { title: item.fallbackText || t("fallbackTitle"), body: "" };
}
