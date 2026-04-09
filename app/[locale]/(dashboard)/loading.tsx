import { getTranslations } from "next-intl/server";

import { PageLoadingState } from "@/components/state/page-loading-state";

export default async function DashboardLoading() {
  const t = await getTranslations("dashboard.states");

  return <PageLoadingState message={t("loading")} />;
}
