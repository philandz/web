export type DatePreset = "today" | "last7Days" | "thisMonth" | "custom";
export type DateRange = { from: string; to: string };

export function formatLocalYmd(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getCurrentMonthRange(today = new Date()): DateRange {
  const localToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const first = new Date(localToday.getFullYear(), localToday.getMonth(), 1);
  return { from: formatLocalYmd(first), to: formatLocalYmd(localToday) };
}

export function getPresetRange(
  preset: DatePreset,
  today = new Date(),
): DateRange | null {
  const localToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  switch (preset) {
    case "today":
      return { from: formatLocalYmd(localToday), to: formatLocalYmd(localToday) };
    case "last7Days": {
      const from = new Date(localToday);
      from.setDate(from.getDate() - 6);
      return { from: formatLocalYmd(from), to: formatLocalYmd(localToday) };
    }
    case "thisMonth":
      return getCurrentMonthRange(localToday);
    case "custom":
      return null;
  }
}

export function detectDatePreset(
  from: string,
  to: string,
  today = new Date(),
): DatePreset | null {
  if (!from || !to) return null;

  const localToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const todayYmd = formatLocalYmd(localToday);

  // today
  if (from === todayYmd && to === todayYmd) return "today";

  // last 7 days
  const fromDate = new Date(from);
  const toDate = new Date(to);
  const diffMs = toDate.getTime() - fromDate.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 6) {
    const from7 = new Date(localToday);
    from7.setDate(from7.getDate() - 6);
    if (formatLocalYmd(from7) === from) return "last7Days";
  }

  // this month
  const firstOfMonth = new Date(localToday.getFullYear(), localToday.getMonth(), 1);
  if (formatLocalYmd(firstOfMonth) === from && todayYmd === to) return "thisMonth";

  return "custom";
}
