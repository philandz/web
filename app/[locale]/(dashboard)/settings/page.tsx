"use client";

import { useTranslations } from "next-intl";
import { Paintbrush2, SlidersHorizontal } from "lucide-react";

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
    <section className="space-y-5">
      <header className="surface-panel rounded-2xl p-5 md:p-6">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
      </header>

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
