"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Crown, UserMinus } from "lucide-react";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/state/toast-provider";
import {
  useParticipantsQuery,
  useRevokeParticipantMutation,
} from "@/modules/sharing/hooks";
import { useTenantContext } from "@/modules/tenant/use-tenant-context";
import { safeDisplayName } from "@/lib/safe-display-name";

type MembersTabProps = {
  budgetId: string;
};

export function MembersTab({ budgetId }: MembersTabProps) {
  const t = useTranslations("sharing");
  const toast = useToast();
  const { orgRole } = useTenantContext();
  const isOwner = orgRole === "owner";

  const { data: participants, isLoading } = useParticipantsQuery(budgetId);
  const revokeMutation = useRevokeParticipantMutation();

  const [confirmRevoke, setConfirmRevoke] = useState<{
    id: string;
    displayName: string;
  } | null>(null);

  function performRevoke() {
    if (!confirmRevoke) return;
    revokeMutation.mutate(
      { budgetId, participantId: confirmRevoke.id },
      {
        onSuccess: () => {
          toast.success(t("members.removeSuccess"));
          setConfirmRevoke(null);
        },
        onError: () => {
          toast.error(t("errors.errorGeneric"));
          setConfirmRevoke(null);
        },
      },
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 rounded-lg border border-border/40 bg-card p-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-32 rounded" />
              <Skeleton className="h-3 w-20 rounded" />
            </div>
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
        ))}
      </div>
    );
  }

  if (!participants || participants.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-border/60 bg-card py-12 text-center">
        <p className="text-sm text-muted-foreground">{t("members.noMembers")}</p>
      </div>
    );
  }

  // TODO(t2.6): backend does not expose per-budget owner field yet.
  // Fallback: first non-guest member is treated as owner until T2.6 wires real field.
  const firstNonGuestId =
    participants.find(
      (p) => p.kind !== "GUEST" && (typeof p.kind !== "number" || p.kind !== 2),
    )?.participantId ?? null;

  return (
    <div className="space-y-3">
      {participants.map((p) => {
        const isGuest =
          p.kind === "GUEST" || (typeof p.kind === "number" && p.kind === 2);
        const isFallbackOwner = !isGuest && p.participantId === firstNonGuestId;

        return (
          <div
            key={p.participantId}
            className="flex items-center gap-3 rounded-lg border border-border/40 bg-card p-4"
          >
            <UserAvatar
              name={safeDisplayName(p.displayName)}
              size={40}
              className="shrink-0"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="truncate text-sm font-medium text-foreground">
                  {safeDisplayName(p.displayName)}
                </span>
                {isFallbackOwner && (
                  <Badge
                    variant="outline"
                    className="border-amber-500/50 text-[10px] text-amber-600 dark:text-amber-400"
                  >
                    {t("members.owner")}
                  </Badge>
                )}
                {isGuest && (
                  <Badge
                    variant="outline"
                    className="border-border/60 text-[10px] text-muted-foreground"
                  >
                    {t("members.guest")}
                  </Badge>
                )}
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {isGuest ? t("members.guestLabel") : t("members.memberLabel")}
              </p>
            </div>

            {/* Role badge */}
            {!isGuest && !isFallbackOwner && (
              <Badge variant="secondary" className="shrink-0 text-xs">
                {t("members.member")}
              </Badge>
            )}
            {isGuest && (
              <Badge variant="outline" className="shrink-0 text-xs">
                {t("members.guest")}
              </Badge>
            )}

            {/* Owner-only actions */}
            {isOwner && (
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 text-muted-foreground hover:text-amber-500"
                  disabled
                  title={t("members.notYetSupported")}
                >
                  <Crown className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-xs text-muted-foreground"
                  disabled
                  title={t("members.notYetSupported")}
                >
                  {t("members.changeRole")}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-muted-foreground hover:text-destructive"
                  onClick={() =>
                    setConfirmRevoke({ id: p.participantId, displayName: p.displayName })
                  }
                  aria-label={t("members.remove")}
                >
                  <UserMinus className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>
        );
      })}

      <ConfirmDialog
        open={confirmRevoke !== null}
        onOpenChange={(open) => !open && setConfirmRevoke(null)}
        title={t("members.confirmRemove")}
        description={
          confirmRevoke
            ? t("members.confirmRemoveMessage", { name: confirmRevoke.displayName })
            : ""
        }
        confirmLabel={t("members.remove")}
        cancelLabel={t("form.cancel")}
        onConfirm={performRevoke}
        destructive
        loading={revokeMutation.isPending}
      />
    </div>
  );
}
