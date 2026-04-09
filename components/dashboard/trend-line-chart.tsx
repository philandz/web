import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const points = [16, 20, 22, 19, 24, 28, 26, 30, 32, 29, 36, 38];

function toPath(values: number[]) {
  const width = 420;
  const height = 180;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(1, max - min);

  return values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * width;
      const y = height - ((value - min) / range) * height;
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

export function TrendLineChart() {
  const pathData = toPath(points);

  return (
    <Card className="surface-panel">
      <CardHeader>
        <CardTitle className="text-base">Spending Trend (Last 12 Weeks)</CardTitle>
      </CardHeader>
      <CardContent>
        <svg viewBox="0 0 420 180" className="w-full overflow-visible" role="img" aria-label="Spending trend line chart">
          <defs>
            <linearGradient id="line-gradient" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stopColor="hsl(var(--primary))" />
              <stop offset="100%" stopColor="hsl(var(--accent))" />
            </linearGradient>
          </defs>
          <path
            d={pathData}
            fill="none"
            stroke="url(#line-gradient)"
            strokeWidth="3"
            strokeDasharray="320"
            className="animate-line-reveal motion-reduce:animate-none"
          />
          {points.map((value, index) => {
            const x = (index / (points.length - 1)) * 420;
            const y = 180 - ((value - Math.min(...points)) / (Math.max(...points) - Math.min(...points))) * 180;
            return (
              <circle
                key={`${value}-${index}`}
                cx={x}
                cy={y}
                r="3"
                fill="hsl(var(--primary))"
                className="animate-pulse-soft motion-reduce:animate-none"
              />
            );
          })}
        </svg>
      </CardContent>
    </Card>
  );
}
