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

/** Marks the rows where the interest rate changes, so the schedule explains why a payment moved. */
export function rateChangeAt(rows: Array<{ annualRate: string }>, i: number): boolean {
  return i > 0 && rows[i].annualRate !== rows[i - 1].annualRate;
}

export interface BalancePoint {
  x: number;
  y: number;
}

/** Normalises a balance series to an SVG viewBox (0,0 top-left), newest to the right. */
export function balancePath(values: number[], width: number, height: number, pad = 4): string {
  if (values.length < 2) return "";
  const max = Math.max(...values, 1);
  const step = (width - pad * 2) / (values.length - 1);
  return values
    .map((v, i) => {
      const x = pad + i * step;
      const y = pad + (1 - v / max) * (height - pad * 2);
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

type Payload = Record<string, unknown>;
export function parsePayload(text: string): Payload {
  try {
    const v = JSON.parse(text || "{}");
    return v && typeof v === "object" ? (v as Payload) : {};
  } catch {
    return {};
  }
}

/** Rate in force today (latest period that has started), or null when none is recorded. */
export function currentRate(a: Pick<DebtAccount, "ratePeriods">, now: Date = new Date()): string | null {
  const today = new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
  const started = [...(a.ratePeriods ?? [])].filter((r) => r.effectiveFrom <= today).sort((x, y) => y.effectiveFrom.localeCompare(x.effectiveFrom));
  return started[0]?.annualRate ?? null;
}

/** Overdue first, then active by soonest due date, then settled/closed. */
export function sortAccounts<T extends Pick<DebtAccount, "nextDue" | "status" | "name">>(list: T[], now?: Date): T[] {
  const rank = (a: T) => (isOverdue(a, now) ? 0 : a.status === "active" ? 1 : 2);
  return [...list].sort((a, b) => {
    const r = rank(a) - rank(b);
    if (r !== 0) return r;
    const da = a.nextDue?.dueDate ?? "9999-12-31";
    const db = b.nextDue?.dueDate ?? "9999-12-31";
    return da.localeCompare(db) || a.name.localeCompare(b.name);
  });
}
