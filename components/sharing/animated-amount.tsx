"use client";

import { useEffect, useRef, useState } from "react";
import { MoneyAmount } from "@/components/ui/money-amount";

type AnimatedAmountProps = {
  value: number;
  currency?: string;
  size?: "sm" | "md" | "lg" | "xl";
  durationMs?: number;
};

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function AnimatedAmount({
  value,
  currency = "VND",
  size = "xl",
  durationMs = 600,
}: AnimatedAmountProps) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (value === display) return;
    fromRef.current = display;
    startRef.current = null;
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);

    const tick = (ts: number) => {
      if (startRef.current === null) startRef.current = ts;
      const elapsed = ts - startRef.current;
      const t = Math.min(1, elapsed / durationMs);
      const eased = easeOutCubic(t);
      const next = fromRef.current + (value - fromRef.current) * eased;
      setDisplay(next);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        rafRef.current = null;
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
    // value is the only trigger; display is intentionally not in deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, durationMs]);

  return (
    <MoneyAmount
      value={Math.round(display)}
      currency={currency}
      size={size}
      sign="neutral"
    />
  );
}
