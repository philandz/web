// Locale-aware formatting helpers. Use these instead of hardcoded
// vi-VN / Intl.NumberFormat("vi-VN") / hardcoded English strings so
// the UI follows the user's selected locale.

import { useLocale } from "next-intl";
import type { AppLocale } from "@/i18n/routing";

/** Format a money amount in the active locale's standard convention. */
export function formatCurrency(
  value: number,
  currency: string,
  locale: AppLocale | string,
): string {
  return new Intl.NumberFormat(localeToBCP47(locale), {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/** Format a plain number with locale grouping (1,234 / 1.234 / 1 234). */
export function formatNumber(value: number, locale: AppLocale | string): string {
  return new Intl.NumberFormat(localeToBCP47(locale)).format(value);
}

/** Format a Date or epoch-seconds with locale date + time. */
export function formatDateTime(
  ts: number | Date,
  locale: AppLocale | string,
): string {
  const date = typeof ts === "number" ? new Date(ts * (ts < 1e12 ? 1000 : 1)) : ts;
  return new Intl.DateTimeFormat(localeToBCP47(locale), {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

/** Format a Date or epoch-seconds with locale short date (d/m/y vs m/d/y vs y-m-d). */
export function formatDate(
  ts: number | Date,
  locale: AppLocale | string,
): string {
  const date = typeof ts === "number" ? new Date(ts * (ts < 1e12 ? 1000 : 1)) : ts;
  return new Intl.DateTimeFormat(localeToBCP47(locale), {
    dateStyle: "short",
  }).format(date);
}

/** Format an ISO date string (yyyy-mm-dd or full ISO) as a localized date. */
export function formatIsoDate(
  iso: string,
  locale: AppLocale | string,
): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return formatDate(date, locale);
}

/** Format a duration in ms as a locale-aware compact string (e.g. "2d 4h" / "2n 4g"). */
export function formatDuration(
  ms: number,
  locale: AppLocale | string,
): string {
  if (ms <= 0) return "";
  const days = Math.floor(ms / 86_400_000);
  const hours = Math.floor((ms % 86_400_000) / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);

  // Use Intl.DurationFormat when available; otherwise fall back to a
  // manual short form. Cast to any because TS lib.dom types lag
  // behind the runtime support in modern Node/browsers.
  const IntlAny = Intl as unknown as {
    DurationFormat?: new (
      locale: string,
      options: {
        style?: "narrow" | "long" | "short" | "digital";
        [unit: string]: unknown;
      },
    ) => { format: (parts: Record<string, number>) => string };
  };
  if (typeof IntlAny.DurationFormat === "function") {
    try {
      const fmt = new IntlAny.DurationFormat(localeToBCP47(locale), {
        style: "narrow",
        days: days > 0 ? "numeric" : undefined,
        hours: hours > 0 ? "numeric" : undefined,
        minutes: minutes > 0 ? "numeric" : undefined,
      });
      return fmt.format({
        days: days > 0 ? days : 0,
        hours: hours > 0 ? hours : 0,
        minutes: minutes > 0 ? minutes : 0,
      });
    } catch {
      // Intl.DurationFormat not supported in this runtime — fall through.
    }
  }

  // Manual fallback. Most locales use compact suffixes; full names
  // can be replaced later via i18n if a particular locale needs them.
  if (days > 0) return `${days}d ${hours > 0 ? `${hours}h` : ""}`.trim();
  if (hours > 0) return `${hours}h ${minutes > 0 ? `${minutes}m` : ""}`.trim();
  return `${minutes}m`;
}

/** Relative time using Intl.RelativeTimeFormat (no manual plural rules).
 *  Accepts epoch seconds OR milliseconds (auto-detected by magnitude). */
export function formatRelativeTime(
  ts: number,
  locale: AppLocale | string,
  nowMs: number = Date.now(),
): string {
  const tsMs = ts < 1e12 ? ts * 1000 : ts;
  const diffMs = tsMs - nowMs;
  const absSec = Math.abs(diffMs) / 1000;
  const rtf = new Intl.RelativeTimeFormat(localeToBCP47(locale), {
    numeric: "always",
  });
  if (absSec < 45) return rtf.format(Math.round(diffMs / 1000), "second");
  if (absSec < 3600) return rtf.format(Math.round(diffMs / 60_000), "minute");
  if (absSec < 86400) return rtf.format(Math.round(diffMs / 3_600_000), "hour");
  if (absSec < 604800) return rtf.format(Math.round(diffMs / 86_400_000), "day");
  if (absSec < 2_592_000) return rtf.format(Math.round(diffMs / 604_800_000), "week");
  if (absSec < 31_536_000) return rtf.format(Math.round(diffMs / 2_592_000_000), "month");
  return rtf.format(Math.round(diffMs / 31_536_000_000), "year");
}

/** Convert "en" / "vi" to BCP-47 ("en-US" / "vi-VN"). */
export function localeToBCP47(locale: AppLocale | string): string {
  if (locale === "vi") return "vi-VN";
  if (locale === "en") return "en-US";
  return locale;
}

// ---------------------------------------------------------------------------
// React hooks — use these inside components so they re-render on locale change
// ---------------------------------------------------------------------------

/**
 * Hook variant that reads the active locale via `useLocale()`. Use this
 * inside client components so values re-render on locale switch.
 */
export function useFormatLocale(): AppLocale {
  return useLocale() as AppLocale;
}