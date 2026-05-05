"use client";

import { useTranslations } from "next-intl";
import { Paintbrush2, Settings2, SlidersHorizontal } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";
import { useTenantContext } from "@/modules/tenant/use-tenant-context";

export default function SettingsPage() {
  const t = useTranslations("dashboard.settings");
  const tShell = useTranslations("dashboard.shell");
  const router = useRouter();
  const tenant = useTenantContext();

  return (
    <section className="space-y-5 animate-fade-in-up">
      <PageHeader
        title={t("title")}
        description={t("subtitle")}
        icon={<Settings2 className="h-5 w-5" />}
      />

      <article className="surface-panel rounded-2xl p-5 md:p-6">
        <div className="mb-4 flex items-start gap-3">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-highlight/20 text-foreground">
            <Paintbrush2 className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-base font-semibold text-foreground">{t("appearanceTitle")}</h2>
            <p className="text-sm text-muted-foreground">{t("appearanceDescription")}</p>
          </div>
        </div>

        <div className="surface-muted rounded-xl p-3">
          <p className="text-sm text-muted-foreground">{t("quickHint")}</p>
        </div>
      </article>

      <article className="surface-panel rounded-2xl p-5 md:p-6">
        <div className="mb-2 flex items-start gap-3">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-muted text-foreground">
            <SlidersHorizontal className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-base font-semibold text-foreground">{t("preferencesTitle")}</h2>
            <p className="text-sm text-muted-foreground">{t("preferencesDescription")}</p>
          </div>
        </div>

        <div className="surface-muted mt-3 rounded-xl p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-foreground">{t("tenantContextTitle")}</p>
            <Badge variant="secondary" className="capitalize">
              {tenant.orgRole}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{tenant.selectedOrganization?.name ?? tShell("noOrganization")}</p>

          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={!tenant.permissions.canManageOrganization}
              onClick={() => router.push("/organization")}
            >
              {tShell("manageOrganization")}
            </Button>
            <Button size="sm" variant="secondary" onClick={() => router.push("/select-organization")}>
              {t("switchOrganization")}
            </Button>
          </div>
        </div>
      </article>
    </section>
  );
}
