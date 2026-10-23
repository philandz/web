import type { TransactionKind } from "@/services/transaction-service";

export function isTransferKind(k: TransactionKind): k is "transfer_out" | "transfer_in" {
  return k === "transfer_out" || k === "transfer_in";
}

/** Money coming into (+) or leaving (−) the budget this entry belongs to. */
export function isInflow(k: TransactionKind): boolean {
  return k === "income" || k === "transfer_in";
}

export function amountSign(k: TransactionKind): "+" | "−" {
  return isInflow(k) ? "+" : "−";
}

/** Transfers use a neutral colour: they move money, they are not earnings or spending. */
export function amountToneClass(k: TransactionKind): string {
  if (isTransferKind(k)) return "text-sky-600 dark:text-sky-400";
  return k === "income" ? "text-emerald-600 dark:text-emerald-400" : "text-red-500";
}

export function iconToneClass(k: TransactionKind): string {
  if (isTransferKind(k)) return "bg-sky-500/10 text-sky-600 dark:text-sky-400";
  return k === "income"
    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
    : "bg-red-500/10 text-red-500";
}
