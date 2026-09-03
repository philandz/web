"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowRight, Scale, Loader2, CheckCircle2 } from "lucide-react";
import { MoneyAmount } from "@/components/ui/money-amount";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useSettlementQuery,
  useSettlementsQuery,
  useParticipantsQuery,
} from "@/modules/sharing/hooks";
import { useParticipantNameLookup } from "@/modules/sharing/participant-name-lookup";
import { sharingService } from "@/services/sharing-service";
import { MarkAsSettledDialog } from "./mark-as-settled-dialog";
import { useQuery } from "@tanstack/react-query";

type BalancesTabProps = {
  budgetId: string;
};

// TODO(t2.6): If the gateway REST route for GET /budgets/{id}/balances is
// missing, sharingService.getBalances will reject at runtime. The fallback
// empty state below prevents a crash; follow up in T2.6 to wire the route.
export function BalancesTab({ budgetId }: BalancesTabProps) {
  const t = useTranslations("sharing");
  const { data: balances, isLoading: balancesLoading, isError: balancesError } = useQuery({
    queryKey: ["sharing", "balances", budgetId] as const,
    queryFn: () => sharingService.getBalances(budgetId),
    enabled: Boolean(budgetId),
  });

  const { data: settlement, isLoading: settlementLoading } = useSettlementQuery(budgetId);
  const { data: confirmations } = useSettlementsQuery(budgetId);
  const { data: participants } = useParticipantsQuery(budgetId);
  const { resolve: resolveName } = useParticipantNameLookup(budgetId);
  const [selectedTransfer, setSelectedTransfer] = useState<{
    fromParticipantId: string;
    fromName: string;
    toParticipantId: string;
    toName: string;
    amount: number;
  } | null>(null);

  const participantNameByUserId = useMemo(() => {
    const map = new Map<string, string>();
    (participants ?? []).forEach((p) => {
      if (p.userId) map.set(p.userId, p.displayName);
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

  const unsettled = useMemo(() => {
    return (settlement?.transfers ?? []).filter(
      (tr) =>
        !settledPairs.has(
          `${tr.fromUserId}|${tr.toUserId}|${tr.amount}`,
        ),
    );
  }, [settlement, settledPairs]);

  const isLoading = balancesLoading || settlementLoading;

  if (isLoading) {
    return (
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-32" />
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14 rounded-xl" />
          ))}
        </div>
      </section>
    );
  }

  if (balancesError) {
    return (
      <div className="rounded-lg border border-border/60 bg-card p-6 text-center">
        <p className="text-sm text-muted-foreground">
          {t("balances.unavailable")}
        </p>
      </div>
    );
  }

  const hasBalances = (balances ?? []).length > 0;
  const hasSuggestedTransfers = unsettled.length > 0;

  if (!hasBalances && !hasSuggestedTransfers) {
    return (
      <div className="rounded-lg border border-border/60 bg-card p-6 text-center">
        <Scale className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">{t("balances.empty")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Per-member net balances */}
      {hasBalances && (
        <section>
          <h3 className="mb-3 text-sm font-semibold text-foreground">
            {t("balances.title")}
          </h3>
          <div className="space-y-2">
            {(balances ?? []).map((b) => {
              const isPositive = b.netBalance >= 0;
              const absAmount = Math.abs(b.netBalance);
              const displayName = participantNameByUserId.get(b.userId) ?? b.displayName;
              return (
                <div
                  key={b.userId}
                  className="flex items-center gap-3 rounded-xl border border-border/60 bg-card/60 p-3"
                >
                  <UserAvatar name={displayName} size={32} />
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {displayName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {isPositive ? t("balances.owed") : t("balances.owes")}
                    </p>
                  </div>
                  <MoneyAmount
                    value={absAmount}
                    currency="VND"
                    size="sm"
                    sign={isPositive ? "positive" : "negative"}
                  />
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Suggested transfers */}
      {hasSuggestedTransfers && (
        <section>
          <h3 className="mb-3 text-sm font-semibold text-foreground">
            {t("balances.suggestedTransfers")}
          </h3>
          <div className="space-y-2">
            {unsettled.map((tr, idx) => {
              const fromId = tr.fromUserId ?? "";
              const toId = tr.toUserId ?? "";
              const fromName = participantNameByUserId.get(fromId) ?? resolveName(fromId);
              const toName = participantNameByUserId.get(toId) ?? resolveName(toId);
              const amount = Number(tr.amount ?? 0);

              return (
                <div
                  key={`${fromId}-${toId}-${idx}`}
                  className="flex items-center gap-3 rounded-xl border border-border/60 bg-card/60 p-3"
                >
                  <UserAvatar name={fromName} size={32} />
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  <UserAvatar name={toName} size={32} />
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {fromName} → {toName}
                    </p>
                  </div>
                  <MoneyAmount value={amount} currency="VND" size="sm" sign="positive" />
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
                  >
                    {t("balances.markSettled")}
                  </Button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* All settled banner */}
      {!hasSuggestedTransfers && (balances ?? []).some((b) => b.netBalance !== 0) && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <p className="text-sm text-emerald-700 dark:text-emerald-300">
            {t("settlement.allSettled")}
          </p>
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
    </div>
  );
}
