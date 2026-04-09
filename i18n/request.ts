import { getRequestConfig } from "next-intl/server";

import { isAppLocale, routing } from "@/i18n/routing";

async function loadMessages(locale: string) {
  const [common, auth, dashboard, admin] = await Promise.all([
    import(`@/locales/${locale}/common.json`).then((mod) => mod.default),
    import(`@/locales/${locale}/auth.json`).then((mod) => mod.default),
    import(`@/locales/${locale}/dashboard.json`).then((mod) => mod.default),
    import(`@/locales/${locale}/admin.json`).then((mod) => mod.default)
  ]);

  return {
    common,
    auth,
    dashboard,
    admin
  };
}

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = requested && isAppLocale(requested) ? requested : routing.defaultLocale;

  return {
    locale,
    messages: await loadMessages(locale)
  };
});
