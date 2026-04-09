import { getTranslations } from "next-intl/server";

import { PageLoadingState } from "@/components/state/page-loading-state";

export default async function AdminLoading() {
  const t = await getTranslations("admin.states");

  return <PageLoadingState message={t("loading")} />;
}
