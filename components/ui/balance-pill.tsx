"use client";

import { MoneyAmount } from "@/components/ui/money-amount";

type BalancePillProps = {
  value: number;
  size?: "sm" | "md";
};

const sizeClasses = {
  sm: "text-xs px-1.5 py-0.5",
  md: "text-sm px-2 py-1",
};

export function BalancePill({ value, size = "md" }: BalancePillProps) {
  const isPositive = value > 0;
  const isNegative = value < 0;

  const pillClass = isPositive
    ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
    : isNegative
      ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
      : "bg-muted text-muted-foreground";

  const formattedValue = new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    minimumFractionDigits: 0,
  }).format(Math.abs(value));

  const sign = isPositive ? "+" : isNegative ? "−" : "";

  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full font-medium ${pillClass} ${sizeClasses[size]}`}
    >
      {sign && <span>{sign}</span>}
      <span className="tabular-nums">{formattedValue}</span>
    </span>
  );
}
