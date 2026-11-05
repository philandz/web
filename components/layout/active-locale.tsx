"use client";

import { setActiveLocale } from "@/lib/active-locale";

/** Publishes the route locale to the non-hook formatting helpers in `lib/format.ts`. */
export function ActiveLocale({ locale }: { locale: string }) {
  setActiveLocale(locale);
  return null;
}
