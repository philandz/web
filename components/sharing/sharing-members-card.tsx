"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, UserCheck, UserMinus, UserPlus, Users } from "lucide-react";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/state/toast-provider";
import {
  useParticipantsQuery,
  useRevokeParticipantMutation,
  useSettlementQuery,
} from "@/modules/sharing/hooks";
import { formatCurrency, useFormatLocale } from "@/lib/format";
import { InviteMemberDialog } from "./invite-member-dialog";

type SharingMembersCardProps = {
  budgetId: string;
  budgetName?: string;
};

export function SharingMembersCard({
  budgetId,
  budgetName = "Sharing Budget",
}: SharingMembersCardProps) {
  const t = useTranslations("sharing");
  const locale = useFormatLocale();
  const toast = useToast();
  const { data: participants, isLoading } = useParticipantsQuery(budgetId);
  const { data: settlement } = useSettlementQuery(budgetId);
  const revokeMutation = useRevokeParticipantMutation();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [confirmRevoke, setConfirmRevoke] = useState<
    | { id: string; displayName: string }
    | null
  >(null);

  // Map participant id -> net balance from the settlement response.
  // The settlement rows use user_id; for guests that's "g_<uuid>".
  const balanceByParticipant = useMemo(() => {
    const map = new Map<string, number>();
    const transfers = settlement?.transfers ?? [];
    // The settlement response shape — adjust if backend uses different keys.
    for (const row of transfers as Array<{
      fromUserId?: string;
      from_user_id?: string;
      toUserId?: string;
      to_user_id?: string;
      amount?: number;
    }>) {
      const from = row.fromUserId ?? row.from_user_id ?? "";
      const to = row.toUserId ?? row.to_user_id ?? "";
      const amt: number = Number(row.amount ?? 0);
      if (from) {
        const cur: number = map.get(from) ?? 0;
        map.set(from, cur - amt);
      }
      if (to) {
        const cur: number = map.get(to) ?? 0;
        map.set(to, cur + amt);
      }
    }
    return map;
  }, [settlement]);

  function performRevoke() {
    if (!confirmRevoke) return;
    revokeMutation.mutate(
      { budgetId, participantId: confirmRevoke.id },
      {
        onSuccess: () => {
          toast.success(t("members.revokeParticipant"));
          setConfirmRevoke(null);
        },
        onError: () => {
          toast.error(t("form.confirm"));
          setConfirmRevoke(null);
        },
      },
    );
  }

  if (isLoading) {
    return (
      <section className="surface-panel animate-fade-in-up p-4 sm:p-5">
        <div className="mb-3 flex items-center gap-2">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-5 w-32 rounded" />
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 p-2">
              <Skeleton className="h-9 w-9 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-28 rounded" />
                <Skeleton className="h-3 w-16 rounded" />
              </div>
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="surface-panel animate-fade-in-up p-4 sm:p-5">
      <header className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/12 text-amber-600 dark:text-amber-400">
            <Users className="h-4 w-4" />
          </div>
          <h3 className="text-base font-semibold text-foreground">
            {t("members.title")}
          </h3>
          {participants && participants.length > 0 && (
            <Badge variant="secondary" className="text-[10px]">
              {participants.length}
            </Badge>
          )}
        </div>
      </header>

      {!participants || participants.length === 0 ? (
        <EmptyState
          icon={<UserPlus className="h-6 w-6" />}
          title={t("members.inviteFirstCta")}
          description={t("budget.emptyExpenses")}
          actionLabel={t("header.invite")}
          onAction={() => setInviteOpen(true)}
        />
      ) : (
        <div className="divide-y divide-border/40">
          {participants.map((p) => {
            const isGuest =
              p.kind === "GUEST" || (typeof p.kind === "number" && p.kind === 2);
            // Settlement rows use the identity user_id (not the participant
            // row UUID). Members carry `userId`; guests carry no identity
            // user_id so their balance is always 0 here.
            const balance: number = p.userId
              ? balanceByParticipant.get(p.userId) ?? 0
              : 0;
            const hasBalance = Math.abs(balance) > 0;
            return (
              <div
                key={p.participantId}
                className="flex items-center gap-3 py-2.5"
              >
                <UserAvatar name={p.displayName} size={36} className="shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-sm font-medium text-foreground">
                      {p.displayName}
                    </span>
                    {isGuest && (
                      <Badge
                        variant="outline"
                        className="border-border/60 text-[10px] text-muted-foreground"
                      >
                        {t("members.guest")}
                      </Badge>
                    )}
                  </div>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {hasBalance
                      ? balance > 0
                        ? t("expense.owesYou", { name: p.displayName })
                        : t("expense.youOwe", { name: p.displayName })
                      : t("expense.settledUp")}
                  </p>
                </div>
                {hasBalance ? (
                  <span
                    className={
                      "shrink-0 text-sm font-semibold tabular-nums " +
                      (balance > 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-rose-600 dark:text-rose-400")
                    }
                  >
                    {balance > 0 ? "+" : ""}
                    {formatCurrency(balance, "VND", locale)}
                  </span>
                ) : (
                  <UserCheck className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => setConfirmRevoke({ id: p.participantId, displayName: p.displayName })}
                  aria-label={t("members.revokeParticipant")}
                >
                  <UserMinus className="h-3.5 w-3.5" />
                </Button>
              </div>
            );
          })}
        </div>
      )}

      <InviteMemberDialog
        budgetId={budgetId}
        budgetName={budgetName}
        open={inviteOpen}
        onOpenChange={setInviteOpen}
      />

      <ConfirmDialog
        open={confirmRevoke !== null}
        onOpenChange={(open) => !open && setConfirmRevoke(null)}
        title={t("members.revokeParticipant")}
        description={
          confirmRevoke
            ? t("members.revokeConfirm", { name: confirmRevoke.displayName })
            : ""
        }
        confirmLabel={t("members.revokeParticipant")}
        cancelLabel={t("form.cancel")}
        onConfirm={performRevoke}
        destructive
        loading={revokeMutation.isPending}
      />
    </section>
  );
}