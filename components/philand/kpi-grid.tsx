import { ArrowDownRight, ArrowUpRight } from "lucide-react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const items = [
  { title: "Total Balance", value: "$84,921.00", delta: "+12.4%", up: true },
  { title: "Income", value: "$16,840.00", delta: "+4.2%", up: true },
  { title: "Expenses", value: "$7,218.00", delta: "-2.1%", up: false },
  { title: "Savings Rate", value: "34.6%", delta: "+1.6 pts", up: true }
];

export function KpiGrid() {
  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <Card key={item.title} className={cn("surface-panel border shadow-sm")}> 
          <CardHeader className="pb-2">
            <p className={cn("text-xs uppercase tracking-[0.12em] text-slate-500 dark:text-slate-300")}>{item.title}</p>
          </CardHeader>
          <CardContent className="pt-0">
            <p className={cn("text-2xl font-semibold tracking-tight text-slate-900 dark:text-white")}>{item.value}</p>
            <span
              className={cn(
                "mt-2 inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
                item.up ? "bg-emerald-500/15 text-emerald-500" : "bg-red-500/15 text-red-500"
              )}
            >
              {item.up ? <ArrowUpRight className="mr-1 h-3.5 w-3.5" /> : <ArrowDownRight className="mr-1 h-3.5 w-3.5" />}
              {item.delta}
            </span>
          </CardContent>
        </Card>
      ))}
    </section>
  );
}
