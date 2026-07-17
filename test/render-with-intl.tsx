"use client";

import { NextIntlClientProvider } from "next-intl";
import { render, type RenderOptions, type RenderResult } from "@testing-library/react";
import enMessages from "@/locales/en/sharing.json";
import viMessages from "@/locales/vi/sharing.json";

const ALL_MESSAGES = {
  en: { sharing: enMessages },
  vi: { sharing: viMessages },
} as const;

type Locale = "en" | "vi";

export function renderWithIntl(
  ui: React.ReactNode,
  options: RenderOptions & { locale?: Locale } = {},
): RenderResult {
  const { locale = "en", ...renderOptions } = options;
  return render(
    <NextIntlClientProvider locale={locale} messages={ALL_MESSAGES[locale]} timeZone="UTC">
      {ui}
    </NextIntlClientProvider>,
    renderOptions,
  );
}