export type ProgressStatus = "ok" | "warn" | "over";

/** Mirrors insight's period summary: WARN from 80% of plan, OVER above 100%. */
export function progressStatus(spent: number, planned: number): ProgressStatus {
  if (planned <= 0) return spent > 0 ? "over" : "ok";
  const pct = (spent / planned) * 100;
  if (pct > 100) return "over";
  if (pct >= 80) return "warn";
  return "ok";
}

export function progressPct(spent: number, planned: number): number {
  if (planned <= 0) return spent > 0 ? 100 : 0;
  return Math.max(0, Math.min(100, (spent / planned) * 100));
}
