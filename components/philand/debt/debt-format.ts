import type { DebtAccount, DebtMethod } from "@/services/debt-service";

export const DEBT_KINDS = ["consumer", "mortgage", "car", "installment", "personal", "other"] as const;
export const DEBT_METHODS: DebtMethod[] = [
  "annuity",
  "equal_principal",
  "interest_only",
  "fixed_installments",
  "no_schedule",
];

export const todayIso = () => new Date().toISOString().slice(0, 10);

export function isScheduled(method: DebtMethod | string) {
  return method !== "no_schedule";
}

/** Days from today to an ISO date (negative = overdue). */
export function daysUntil(iso: string, now: Date = new Date()): number {
  const a = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const [y, m, d] = iso.split("-").map(Number);
  return Math.round((Date.UTC(y, m - 1, d) - a) / 86_400_000);
}

export function isOverdue(a: Pick<DebtAccount, "nextDue" | "status">, now?: Date) {
  return a.status === "active" && Boolean(a.nextDue?.dueDate) && daysUntil(a.nextDue!.dueDate, now) < 0;
}

/** Repaid share of the opening balance, 0..100. */
export function repaidPct(a: Pick<DebtAccount, "openingOutstandingMinor" | "outstandingMinor">) {
  if (a.openingOutstandingMinor <= 0) return 0;
  const pct = ((a.openingOutstandingMinor - a.outstandingMinor) / a.openingOutstandingMinor) * 100;
  return Math.max(0, Math.min(100, Math.round(pct)));
}
