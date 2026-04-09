export type AppUserType = "normal" | "super_admin";
export type AppOrgRole = "owner" | "admin" | "member" | "none";

export function normalizeUserType(input: unknown): AppUserType {
  if (typeof input === "number") {
    if (input === 2) return "super_admin";
    return "normal";
  }

  const normalized = String(input ?? "")
    .trim()
    .toLowerCase();

  if (normalized.includes("super")) return "super_admin";
  return "normal";
}

export function normalizeOrgRole(input: unknown): AppOrgRole {
  if (typeof input === "number") {
    if (input === 1) return "owner";
    if (input === 2) return "admin";
    if (input === 3) return "member";
    return "none";
  }

  const normalized = String(input ?? "")
    .trim()
    .toLowerCase();

  if (normalized.includes("owner")) return "owner";
  if (normalized.includes("admin")) return "admin";
  if (normalized.includes("member")) return "member";
  return "none";
}
