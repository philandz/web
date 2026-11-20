"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { ArrowRight, Building2 } from "lucide-react";

import { EmptyState } from "@/components/state/empty-state";
import { InlineAlert } from "@/components/state/inline-alert";
import { SectionLoadingState } from "@/components/state/section-loading-state";
import { StaggerItem } from "@/components/motion/stagger-item";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { routes } from "@/constants/routes";
import { useRouter } from "@/i18n/navigation";
import { useAuthStore } from "@/lib/auth-store";
import { useOrganizationsQuery } from "@/modules/auth/hooks";
import { PendingInvitations } from "@/components/tenant/pending-invitations";
import { useMyInvitationsQuery } from "@/modules/tenant/hooks";

export default function SelectOrganizationPage() {
  const t = useTranslations("dashboard.selectOrganization");
  const router = useRouter();
  const selectedOrgId = useAuthStore((state) => state.selectedOrgId);
  const selectOrganization = useAuthStore((state) => state.selectOrganization);

  useEffect(() => {
    if (selectedOrgId) {
      router.replace(routes.root);
    }
  }, [router, selectedOrgId]);

  const orgQuery = useOrganizationsQuery();
  const invitations = useMyInvitationsQuery();
  const tInv = useTranslations("dashboard.invitations");

  const handleEnterWorkspace = (orgId: string) => {
    selectOrganization(orgId);
    router.push(routes.root);
  };

  // Nothing to choose: one organization and no invitation waiting → go straight in.
  const onlyOrgId =
    !orgQuery.isLoading && orgQuery.organizations.length === 1 ? orgQuery.organizations[0].id : null;
  const noInvitations = invitations.isSuccess && invitations.data.length === 0;
  useEffect(() => {
    if (!selectedOrgId && onlyOrgId && (noInvitations || invitations.isError)) {
      selectOrganization(onlyOrgId);
      router.replace(routes.root);
    }
  }, [selectedOrgId, onlyOrgId, noInvitations, invitations.isError, selectOrganization, router]);

  return (
    <section className="py-4 sm:py-6">
      <div className="mx-auto max-w-4xl space-y-7">
        <StaggerItem delay={0} className="space-y-3">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{t("context")}</p>
          <h1 className="text-3xl font-semibold md:text-4xl">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </StaggerItem>

        <StaggerItem delay={70} className="space-y-4">
          <PendingInvitations onAccepted={handleEnterWorkspace} />

          {!orgQuery.isLoading && orgQuery.organizations.length > 0 ? (
            <Card className="surface-muted">
              <CardContent className="pt-5 text-sm text-muted-foreground">
                {t("invitedHint", { count: orgQuery.organizations.length })}
              </CardContent>
            </Card>
          ) : null}

          {orgQuery.isLoading ? <SectionLoadingState rows={3} /> : null}

          {orgQuery.isError ? (
            <InlineAlert tone="error">{t("loadError")}</InlineAlert>
          ) : null}

          {orgQuery.organizations.map((org) => (
            <Card className="surface-panel" key={org.id}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Building2 className="h-5 w-5 text-highlight" />
                  {org.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-start justify-between gap-3 pt-2 sm:flex-row sm:items-center">
                <Badge variant="secondary">{t("role", { role: tInv(`roles.${org.role}`) })}</Badge>
                <Button className="bg-highlight text-slate-900 hover:bg-highlight/90" onClick={() => handleEnterWorkspace(org.id)}>
                  {t("enterWorkspace")} <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </StaggerItem>

        {!orgQuery.isLoading && !orgQuery.organizations.length ? (
          <EmptyState
            title={t("emptyTitle")}
            description={t("empty")}
            action={
              <Button variant="outline" onClick={() => router.push(routes.settings)}>
                {t("emptyAction")}
              </Button>
            }
          />
        ) : null}
      </div>
    </section>
  );
}
