"use client";

type MoneyAmountProps = {
  value: number;
  currency?: string;
  size?: "sm" | "md" | "lg" | "xl";
  sign?: "auto" | "positive" | "negative" | "neutral";
};

const sizeClasses = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-xl font-bold",
  xl: "text-3xl font-bold",
};

const signColorClasses = {
  auto: "", // applied dynamically below
  positive: "text-emerald-600",
  negative: "text-red-600",
  neutral: "text-foreground",
};

export function MoneyAmount({
  value,
  currency = "VND",
  size = "md",
  sign = "auto",
}: MoneyAmountProps) {
  const formatter = new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
  });

  const formatted = formatter.format(value);

  let colorClass: string;
  if (sign === "auto") {
    colorClass = value > 0
      ? "text-emerald-600"
      : value < 0
        ? "text-red-600"
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
