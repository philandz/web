import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const rows = [
  { name: "AWS", date: "Apr 08", category: "Infrastructure", amount: -420, status: "Paid" },
  { name: "Stripe Payout", date: "Apr 07", category: "Revenue", amount: 2380, status: "Completed" },
  { name: "Figma Team", date: "Apr 06", category: "Design", amount: -95, status: "Paid" },
  { name: "Notion", date: "Apr 05", category: "Operations", amount: -24, status: "Paid" },
  { name: "Client Transfer", date: "Apr 04", category: "Revenue", amount: 1240, status: "Completed" }
];

export function TransactionsTable() {
  return (
    <Card className={cn("surface-panel border shadow-sm")}>
      <CardHeader>
        <CardTitle className={cn("text-base text-slate-900 dark:text-white")}>Latest Transactions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 md:hidden">
          {rows.map((row) => (
            <article key={`m-${row.name}-${row.date}`} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 dark:border-slate-700 dark:bg-[#232744]">
              <div className="mb-1.5 flex items-start justify-between gap-2">
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{row.name}</p>
                <span className={cn("text-sm font-semibold", row.amount > 0 ? "text-emerald-500" : "text-red-500")}>
                  {row.amount > 0 ? "+" : "-"}${Math.abs(row.amount).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-300">
                <span>{row.date} • {row.category}</span>
                <span
                  className={cn(
                    "rounded-full px-2 py-1 text-[11px] font-medium",
                    row.status === "Completed" ? "bg-emerald-500/15 text-emerald-500" : "bg-slate-500/15 text-slate-400"
                  )}
                >
                  {row.status}
                </span>
              </div>
            </article>
          ))}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className={cn("border-b border-slate-200 dark:border-slate-700")}>
              <th className="py-2 text-left font-medium text-slate-400">Name</th>
              <th className="py-2 text-left font-medium text-slate-400">Date</th>
              <th className="py-2 text-left font-medium text-slate-400">Category</th>
              <th className="py-2 text-right font-medium text-slate-400">Amount</th>
              <th className="py-2 text-right font-medium text-slate-400">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`${row.name}-${row.date}`} className={cn("border-b border-slate-100 dark:border-slate-800")}>
                <td className={cn("py-3 font-medium text-slate-900 dark:text-slate-100")}>{row.name}</td>
                <td className={cn("py-3 text-slate-500 dark:text-slate-300")}>{row.date}</td>
                <td className={cn("py-3 text-slate-500 dark:text-slate-300")}>{row.category}</td>
                <td className={cn("py-3 text-right font-semibold", row.amount > 0 ? "text-emerald-500" : "text-red-500")}>
                  {row.amount > 0 ? "+" : "-"}${Math.abs(row.amount).toLocaleString()}
                </td>
                <td className="py-3 text-right">
                  <span
                    className={cn(
                      "rounded-full px-2 py-1 text-xs font-medium",
                      row.status === "Completed" ? "bg-emerald-500/15 text-emerald-500" : "bg-slate-500/15 text-slate-400"
                    )}
                  >
                    {row.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
