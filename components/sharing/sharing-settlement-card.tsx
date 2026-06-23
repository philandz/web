"use client";

import { Check } from "lucide-react";
import { MoneyAmount } from "@/components/ui/money-amount";
import { AvatarStack } from "@/components/ui/avatar-stack";
import { BalancePill } from "@/components/ui/balance-pill";
import { EmptyState } from "@/components/ui/empty-state";
import { useSettlementsQuery, useMarkSettledMutation } from "@/modules/sharing/hooks";
import { MarkAsSettledDialog } from "./mark-as-settled-dialog";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/state/toast-provider";
import { Loader2 } from "lucide-react";

type SharingSettlementCardProps = {
  budgetId: string;
};

export function SharingSettlementCard({ budgetId }: SharingSettlementCardProps) {
  const { data: settlements, isLoading } = useSettlementsQuery(budgetId);
  const [selectedTransfer, setSelectedTransfer] = useState<{
    fromParticipantId: string;
    fromName: string;
    toParticipantId: string;
    toName: string;
    amount: number;
  } | null>(null);
  const toast = useToast();

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="h-5 w-28 bg-muted animate-pulse rounded" />
        {[1, 2].map((i) => (
          <div key={i} className="h-16 bg-muted animate-pulse rounded-xl" />
        ))}
      </div>
    );
  }

  const unsettledTransfers = settlements?.filter((s) => !s.settledAt) ?? [];
  const settledTransfers = settlements?.filter((s) => s.settledAt) ?? [];

  if (unsettledTransfers.length === 0 && settledTransfers.length === 0) {
    return (
      <EmptyState
        icon={<Check className="h-6 w-6" />}
        title="All settled"
        description="No transfers needed"
      />
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-foreground">Settlements</h3>

      {unsettledTransfers.length > 0 && (
        <div className="space-y-2">
          {unsettledTransfers.map((settlement) => (
            <div
              key={settlement.id}
              className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:bg-muted/30 transition-colors"
            >
              <div className="flex-1 flex items-center gap-2 min-w-0">
                <AvatarStack
                  users={[
                    { id: settlement.fromParticipantId, displayName: settlement.fromParticipantId },
                    { id: settlement.toParticipantId, displayName: settlement.toParticipantId },
                  ]}
                  max={2}
                  size="sm"
                />
                <span className="text-sm truncate">
                  {settlement.fromParticipantId} → {settlement.toParticipantId}
                </span>
              </div>
              <MoneyAmount value={settlement.amount} size="sm" />
              <Button
                variant="ghost"
                size="sm"
                className="text-[#0d9488] hover:text-[#0d9488] hover:bg-teal-50 dark:hover:bg-teal-950/30"
                onClick={() =>
                  setSelectedTransfer({
                    fromParticipantId: settlement.fromParticipantId,
                    fromName: settlement.fromParticipantId,
                    toParticipantId: settlement.toParticipantId,
                    toName: settlement.toParticipantId,
                    amount: settlement.amount,
                  })
                }
              >
                Mark settled
              </Button>
            </div>
          ))}
        </div>
      )}

      {settledTransfers.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Settled
          </p>
          {settledTransfers.map((settlement) => (
            <div
              key={settlement.id}
              className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 opacity-60"
            >
              <div className="flex-1 flex items-center gap-2 min-w-0">
                <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                <span className="text-sm truncate">
                  {settlement.fromParticipantId} → {settlement.toParticipantId}
                </span>
              </div>
              <MoneyAmount value={settlement.amount} size="sm" sign="neutral" />
            </div>
          ))}
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