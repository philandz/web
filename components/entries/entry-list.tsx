import { ArrowDownCircle, ArrowUpCircle, Coffee, House, TrainFront } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface Entry {
  id: string;
  title: string;
  category: string;
  date: string;
  amount: number;
}

const entries: Entry[] = [
  { id: "e-1", title: "Apartment rent", category: "Housing", date: "Apr 05", amount: -720 },
  { id: "e-2", title: "Salary payout", category: "Income", date: "Apr 04", amount: 2850 },
  { id: "e-3", title: "Coffee with team", category: "Food", date: "Apr 03", amount: -14.5 },
  { id: "e-4", title: "Metro card top-up", category: "Transport", date: "Apr 02", amount: -24 }
];

function iconByCategory(category: string) {
  if (category === "Housing") return House;
  if (category === "Food") return Coffee;
  if (category === "Transport") return TrainFront;
  return ArrowDownCircle;
}

export function EntryList({ loading }: { loading?: boolean }) {
  return (
    <Card className="surface-panel">
      <CardHeader>
        <CardTitle className="text-base">Recent Entries</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading
          ? Array.from({ length: 6 }).map((_, idx) => <Skeleton key={`entry-skeleton-${idx}`} className="h-16 w-full rounded-xl" />)
          : entries.map((entry) => {
              const Icon = iconByCategory(entry.category);
              const positive = entry.amount > 0;
              return (
                <article
                  key={entry.id}
                  className="flex items-center justify-between rounded-xl border border-border/70 bg-card px-4 py-3 transition-all duration-200 ease-smooth hover:-translate-y-0.5 hover:shadow-soft"
                >
                  <div className="flex items-center gap-3">
                    <span className="rounded-lg bg-muted p-2">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    </span>
                    <div>
                      <p className="text-sm font-medium">{entry.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {entry.category} • {entry.date}
                      </p>
                    </div>
                  </div>

                  <p className={`text-sm font-semibold ${positive ? "money-positive" : "money-negative"}`}>
                    {positive ? "+" : "-"}${Math.abs(entry.amount).toFixed(2)}
                  </p>
                </article>
              );
            })}
      </CardContent>
    </Card>
  );
}

export function EntryListHeaderAction() {
  return (
    <button className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground">
      <ArrowUpCircle className="h-3.5 w-3.5" />
      View all
    </button>
  );
}
