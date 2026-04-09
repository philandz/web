import { ArrowDownRight, ArrowUpRight } from "lucide-react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  label: string;
  value: string;
  delta: string;
  trend: "up" | "down";
  tone?: "default" | "income" | "expense";
}

export function KpiCard({ label, value, delta, trend, tone = "default" }: KpiCardProps) {
  return (
    <Card className="surface-panel">
      <CardHeader className="pb-0">
        <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
      </CardHeader>
      <CardContent className="space-y-3 pt-3">
        <p className={cn("text-3xl font-semibold tracking-tight", tone === "income" && "money-positive", tone === "expense" && "money-negative")}>
          {value}
        </p>
        <p
          className={cn(
            "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
            trend === "up" ? "bg-income/15 text-income" : "bg-expense/15 text-expense"
          )}
        >
          {trend === "up" ? <ArrowUpRight className="mr-1 h-3.5 w-3.5" /> : <ArrowDownRight className="mr-1 h-3.5 w-3.5" />}
          {delta}
        </p>
      </CardContent>
    </Card>
  );
}
