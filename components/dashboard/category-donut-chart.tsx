import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const segments = [
  { label: "Housing", value: 42, color: "hsl(var(--primary))" },
  { label: "Food", value: 24, color: "hsl(var(--accent))" },
  { label: "Transport", value: 18, color: "hsl(var(--info))" },
  { label: "Other", value: 16, color: "hsl(var(--income))" }
];

export function CategoryDonutChart() {
  const circumference = 2 * Math.PI * 56;
  let offset = 0;

  return (
    <Card className="surface-panel">
      <CardHeader>
        <CardTitle className="text-base">Expense by Category</CardTitle>
      </CardHeader>
      <CardContent className="flex items-center gap-5">
        <svg viewBox="0 0 140 140" className="h-36 w-36">
          <g transform="translate(70,70)">
            {segments.map((segment) => {
              const length = (segment.value / 100) * circumference;
              const dashArray = `${length} ${circumference - length}`;
              const circle = (
                <circle
                  key={segment.label}
                  r="56"
                  cx="0"
                  cy="0"
                  fill="none"
                  stroke={segment.color}
                  strokeWidth="16"
                  strokeLinecap="round"
                  strokeDasharray={dashArray}
                  strokeDashoffset={-offset}
                  transform="rotate(-90)"
                />
              );
              offset += length;
              return circle;
            })}
          </g>
        </svg>

        <ul className="space-y-2">
          {segments.map((segment) => (
            <li key={segment.label} className="flex items-center gap-2 text-sm">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: segment.color }} />
              <span className="text-muted-foreground">{segment.label}</span>
              <span className="font-medium">{segment.value}%</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
