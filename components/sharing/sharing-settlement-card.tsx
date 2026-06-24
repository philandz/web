"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowRight, CheckCircle2, Circle, Loader2, Wallet } from "lucide-react";
import { MoneyAmount } from "@/components/ui/money-amount";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useSettlementQuery,
  useSettlementsQuery,
  useParticipantsQuery,
  useMarkSettledMutation,
} from "@/modules/sharing/hooks";
import { MarkAsSettledDialog } from "./mark-as-settled-dialog";

type SharingSettlementCardProps = {
  budgetId: string;
};

export function SharingSettlementCard({ budgetId }: SharingSettlementCardProps) {
  const t = useTranslations("sharing");
  const { data: settlement, isLoading: calcLoading } = useSettlementQuery(budgetId);
  const { data: confirmations, isLoading: confLoading } =
    useSettlementsQuery(budgetId);
  const { data: participants } = useParticipantsQuery(budgetId);
  const markSettled = useMarkSettledMutation();
  const [selectedTransfer, setSelectedTransfer] = useState<{
    fromParticipantId: string;
    fromName: string;
    toParticipantId: string;
    toName: string;
    amount: number;
  } | null>(null);

  const participantNameById = useMemo(() => {
    const map = new Map<string, string>();
    (participants ?? []).forEach((p) => {
      map.set(p.participantId, p.displayName);
    });
    return map;
  }, [participants]);

  const settledPairs = useMemo(() => {
    const s = new Set<string>();
    (confirmations ?? []).forEach((c) => {
      if (c.settledAt) {
        s.add(`${c.fromParticipantId}|${c.toParticipantId}|${c.amount}`);
      }
    });
    return s;
  }, [confirmations]);

  if (calcLoading || confLoading) {
    return (
      <section className="surface-panel animate-fade-in-up p-4 sm:p-5">
        <Skeleton className="mb-3 h-5 w-32" />
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-14 rounded-xl" />
          ))}
        </div>
      </section>
    );
  }

  const transfers = settlement?.transfers ?? [];
  const unsettled = transfers.filter(
    (tr: any) => !settledPairs.has(`${tr.fromUserId ?? tr.from_user_id}|${tr.toUserId ?? tr.to_user_id}|${tr.amount}`),
  );
  const settledConfirmed = (confirmations ?? []).filter((c) => c.settledAt);

  return (
    <section className="surface-panel animate-fade-in-up p-4 sm:p-5">
      <header className="mb-3 flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/12 text-amber-600 dark:text-amber-400">
          <Wallet className="h-4 w-4" />
        </div>
        <h3 className="text-base font-semibold text-foreground">
          {t("settlement.settlements")}
        </h3>
        {unsettled.length === 0 && settledConfirmed.length > 0 && (
          <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-emerald-500/12 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-3 w-3" />
            {t("settlement.allSettled")}
          </span>
        )}
      </header>

      {unsettled.length === 0 && settledConfirmed.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {t("settlement.noTransfersDesc")}
        </p>
      ) : (
        <div className="space-y-4">
          {unsettled.length > 0 && (
            <div className="space-y-2">
              {unsettled.map((tr: any, idx: number) => {
                const fromId = tr.fromUserId ?? tr.from_user_id ?? "";
                const toId = tr.toUserId ?? tr.to_user_id ?? "";
                const fromName =
                  tr.fromName ?? participantNameById.get(fromId) ?? fromId;
                const toName =
                  tr.toName ?? participantNameById.get(toId) ?? toId;
                const amount = Number(tr.amount ?? 0);
                return (
                  <div
                    key={`${fromId}-${toId}-${idx}`}
                    className="flex items-center gap-3 rounded-xl border border-border/60 bg-card/60 p-3 hover-lift"
                  >
                    <UserAvatar name={fromName} size={32} />
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    <UserAvatar name={toName} size={32} />
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {fromName} → {toName}
                      </p>
                    </div>
                    <MoneyAmount value={amount} currency="VND" size="sm" />
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-accent/40 text-accent hover:bg-accent/10"
                      onClick={() =>
                        setSelectedTransfer({
                          fromParticipantId: fromId,
                          fromName,
                          toParticipantId: toId,
                          toName,
                          amount,
                        })
                      }
                      disabled={markSettled.isPending}
                    >
                      {t("settlement.markSettled")}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}

          {settledConfirmed.length > 0 && (
            <div className="space-y-2 opacity-60">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {t("settlement.settlementSettled")} · {settledConfirmed.length}
              </p>
              {settledConfirmed.map((c) => {
                const fromName =
                  participantNameById.get(c.fromParticipantId) ??
                  c.fromParticipantId;
                const toName =
                  participantNameById.get(c.toParticipantId) ??
                  c.toParticipantId;
                return (
                  <div
                    key={c.id}
                    className="flex items-center gap-3 rounded-xl bg-muted/30 p-3"
                  >
                    <Circle className="h-3 w-3 fill-emerald-500 text-emerald-500" />
                    <p className="flex-1 truncate text-sm">
                      {fromName} → {toName}
                    </p>
                    <MoneyAmount
                      value={c.amount}
                      currency="VND"
                      size="sm"
                      sign="neutral"
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {selectedTransfer && (
        <MarkAsSettledDialog
          transfer={selectedTransfer}
          budgetId={budgetId}
          open={Boolean(selectedTransfer)}
          onOpenChange={(open) => {
            if (!open) setSelectedTransfer(null);
          }}
        />
      )}
    </section>
  );
}