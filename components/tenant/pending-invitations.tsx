"use client";

import { Building2, Check, X } from "lucide-react";
import { useTranslations } from "next-intl";

import { useToast } from "@/components/state/toast-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAnswerInvitationMutation, useMyInvitationsQuery } from "@/modules/tenant/hooks";
import { identityService } from "@/services/identity-service";
import { useAuthStore } from "@/lib/auth-store";

/**
 * Organization invitations addressed to the signed-in user, answered right here.
 * Renders nothing while there are none, so it can sit at the top of any page.
 */
export function PendingInvitations({
  className,
  onAccepted,
}: {
  className?: string;
  /** Called with the organization just joined (e.g. to switch to it). */
  onAccepted?: (orgId: string) => void;
}) {
  const t = useTranslations("dashboard.invitations");
  const toast = useToast();
  const { data: invitations = [] } = useMyInvitationsQuery();
  const answer = useAnswerInvitationMutation();
  const setOrganizations = useAuthStore((state) => state.setOrganizations);

  if (invitations.length === 0) return null;

  function respond(id: string, orgId: string, kind: "accept" | "decline") {
    answer.mutate(
      { id, answer: kind },
      {
        onSuccess: async () => {
          if (kind === "accept") {
            toast.success(t("accepted"));
            // The switcher reads organizations from the session: load the new one first.
            try {
              setOrganizations(await identityService.organizations());
            } catch {
              // Non-fatal: it shows up after the next sign-in.
            }
            onAccepted?.(orgId);
          } else {
            toast.success(t("declined"));
          }
        },
        onError: () => toast.error(t("error")),
      }
    );
  }

  return (
    <div className={cn("space-y-2", className)} data-testid="pending-invitations">
      {invitations.map((inv) => (
        <div
          key={inv.id}
          className="surface-panel flex flex-col gap-3 rounded-2xl border border-primary/25 p-4 sm:flex-row sm:items-center"
        >
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Building2 className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">
              {inv.inviterName
                ? t("title", { inviter: inv.inviterName, org: inv.orgName })
                : t("titleNoInviter", { org: inv.orgName })}
            </p>
            <p className="text-xs text-muted-foreground">{t("role", { role: t(`roles.${inv.orgRole}`) })}</p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={answer.isPending}
              onClick={() => respond(inv.id, inv.orgId, "decline")}
            >
              <X className="mr-1 h-3.5 w-3.5" />
              {t("decline")}
            </Button>
            <Button size="sm" disabled={answer.isPending} onClick={() => respond(inv.id, inv.orgId, "accept")}>
              <Check className="mr-1 h-3.5 w-3.5" />
              {t("accept")}
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
