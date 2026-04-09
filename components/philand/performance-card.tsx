import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const values = [22, 28, 24, 32, 30, 35, 33, 40, 36, 44, 39, 46];

function getPath(data: number[]) {
  const width = 500;
  const height = 180;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = Math.max(1, max - min);

  return data
    .map((value, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((value - min) / range) * height;
      return `${i === 0 ? "M" : "L"}${x},${y}`;
    })
    .join(" ");
}

export function PerformanceCard() {
  const path = getPath(values);

  return (
    <Card className={cn("surface-panel border shadow-sm")}>
      <CardHeader>
        <CardTitle className={cn("text-base text-slate-900 dark:text-white")}>Monthly Performance</CardTitle>
      </CardHeader>
      <CardContent>
        <svg viewBox="0 0 500 180" className="w-full" role="img" aria-label="Performance trend">
          <defs>
            <linearGradient id="perf-gradient" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stopColor="#3B82F6" />
              <stop offset="100%" stopColor="#22D3EE" />
            </linearGradient>
          </defs>
          <path d={path} fill="none" stroke="url(#perf-gradient)" strokeWidth="3" strokeLinecap="round" />
        </svg>
      </CardContent>
    </Card>
  );
}
