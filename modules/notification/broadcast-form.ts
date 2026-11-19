import type { BroadcastAudience, BroadcastInput, NotificationSeverity } from "@/services/notification-service";

export interface BroadcastDraft {
  audience: BroadcastAudience;
  userIds: string; // comma / whitespace separated
  severity: NotificationSeverity;
  titleVi: string;
  bodyVi: string;
  titleEn: string;
  bodyEn: string;
  link: string;
  showBanner: boolean;
}

export type BroadcastError = "titles" | "bodies" | "link" | "users";

export type BroadcastValidation = { ok: true; input: BroadcastInput } | { ok: false; errors: BroadcastError[] };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseUserIds(raw: string): string[] {
  return raw
    .split(/[\s,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Mirrors the service-side rules so the admin gets feedback before the round trip. */
export function validateBroadcast(d: BroadcastDraft): BroadcastValidation {
  const errors: BroadcastError[] = [];
  if (!d.titleVi.trim() || !d.titleEn.trim()) errors.push("titles");
  if (!d.bodyVi.trim() || !d.bodyEn.trim()) errors.push("bodies");

  const link = d.link.trim();
  if (link && (!link.startsWith("/") || link.startsWith("//") || link.includes("\\"))) errors.push("link");

  const userIds = d.audience === "users" ? parseUserIds(d.userIds) : [];
  if (d.audience === "users" && (userIds.length === 0 || userIds.some((id) => !UUID.test(id)))) {
    errors.push("users");
  }

  if (errors.length > 0) return { ok: false, errors };
  return {
    ok: true,
    input: {
      audience: d.audience,
      audienceUserIds: userIds,
      severity: d.severity,
      titleVi: d.titleVi.trim(),
      bodyVi: d.bodyVi.trim(),
      titleEn: d.titleEn.trim(),
      bodyEn: d.bodyEn.trim(),
      link,
      showBanner: d.showBanner,
    },
  };
}
