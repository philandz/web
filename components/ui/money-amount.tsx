"use client";

type MoneyAmountProps = {
  value: number;
  currency?: string;
  size?: "sm" | "md" | "lg" | "xl";
  sign?: "auto" | "positive" | "negative" | "neutral";
  masked?: boolean;
};

const sizeClasses = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-xl font-bold",
  xl: "text-3xl font-bold",
};

const signColorClasses = {
  auto: "", // applied dynamically below
  positive: "text-emerald-700",
  negative: "text-red-700",
  neutral: "text-foreground",
};

export function MoneyAmount({
  value,
  currency = "VND",
  size = "md",
  sign = "auto",
  masked = false,
}: MoneyAmountProps) {
  const formatted = masked
    ? "•••••"
    : new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency,
        minimumFractionDigits: 0,
      }).format(value);

  let colorClass: string;
  if (sign === "auto") {
    colorClass = value > 0
      ? "text-emerald-700"
      : value < 0
        ? "text-red-700"
        : "text-foreground";
  } else {
    colorClass = signColorClasses[sign];
  }

  return (
    <span className={`tabular-nums ${sizeClasses[size]} ${colorClass}`}>
      {formatted}
    </span>
  );
}
