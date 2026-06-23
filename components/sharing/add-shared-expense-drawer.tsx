"use client";

import { useState, useMemo } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetBody, SheetFooter } from "@/components/ui/sheet";
import { AmountInput } from "@/components/ui/amount-input";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Button } from "@/components/ui/button";
import { AvatarStack } from "@/components/ui/avatar-stack";
import { MoneyAmount } from "@/components/ui/money-amount";
import { useAddExpenseMutation, useParticipantsQuery } from "@/modules/sharing/hooks";
import { useToast } from "@/components/state/toast-provider";
import { useAuthStore } from "@/lib/auth-store";
import { Loader2, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SplitMethod, AddExpenseItemInput } from "@/services/sharing-service";

type AddSharedExpenseDrawerProps = {
  budgetId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type Tab = "equal" | "custom" | "weighted" | "percentage" | "by_item";

const TABS: { value: Tab; label: string }[] = [
  { value: "equal", label: "Equal" },
  { value: "custom", label: "Custom" },
  { value: "weighted", label: "Weighted" },
  { value: "percentage", label: "Percentage" },
  { value: "by_item", label: "By item" },
];

function formatVND(amount: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    minimumFractionDigits: 0,
  }).format(amount);
}

export function AddSharedExpenseDrawer({
  budgetId,
  open,
  onOpenChange,
}: AddSharedExpenseDrawerProps) {
  const [tab, setTab] = useState<Tab>("equal");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<string[]>([]);
  const [expenseDate] = useState(new Date().toISOString().split("T")[0]);

  // Custom split state
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({});

  // Weighted split state
  const [weights, setWeights] = useState<Record<string, string>>({});

  // Percentage split state
  const [percentages, setPercentages] = useState<Record<string, string>>({});

  // By-item split state
  const [items, setItems] = useState<{ label: string; amount: string; assignedTo: string[] }[]>([]);

  const toast = useToast();
  const currentUserId = useAuthStore((state) => state.profile?.id);
  const { data: participants } = useParticipantsQuery(budgetId);
  const addExpense = useAddExpenseMutation();

  const numericAmount = parseInt(amount.replace(/\D/g, "")) || 0;

  const totalWeight = useMemo(() => {
    return Object.values(weights).reduce((sum, w) => sum + (parseInt(w) || 0), 0);
  }, [weights]);

  const totalPercentage = useMemo(() => {
    return Object.values(percentages).reduce((sum, p) => sum + (parseInt(p) || 0), 0);
  }, [percentages]);

  const itemsTotal = useMemo(() => {
    return items.reduce((sum, item) => sum + (parseInt(item.amount.replace(/\D/g, "")) || 0), 0);
  }, [items]);

  const perPersonAmount = useMemo(() => {
    if (selectedParticipantIds.length === 0) return 0;
    if (tab === "equal") return Math.floor(numericAmount / selectedParticipantIds.length);
    if (tab === "weighted" && totalWeight > 0) {
      // This would need to be computed per-person based on their weight
      return 0;
    }
    return 0;
  }, [numericAmount, selectedParticipantIds.length, tab, totalWeight]);

  // Initialize selected participants when drawer opens
  useState(() => {
    if (participants && selectedParticipantIds.length === 0) {
      setSelectedParticipantIds(participants.map((p) => p.participantId));
    }
  });

  function buildLegs() {
    const ids = selectedParticipantIds.length > 0 ? selectedParticipantIds : participants?.map((p) => p.participantId) ?? [];

    switch (tab) {
      case "equal": {
        const perPerson = Math.floor(numericAmount / ids.length);
        return ids.map((userId) => ({ userId, amount: perPerson }));
      }
      case "custom": {
        return ids.map((userId) => ({
          userId,
          amount: parseInt(customAmounts[userId]?.replace(/\D/g, "") || "0"),
        }));
      }
      case "weighted": {
        if (totalWeight === 0) return [];
        return ids.map((userId) => ({
          userId,
          amount: Math.floor((numericAmount * (parseInt(weights[userId] || "0") || 0)) / totalWeight),
          weight: parseInt(weights[userId] || "0") || 0,
        }));
      }
      case "percentage": {
        if (totalPercentage !== 100) return [];
        return ids.map((userId) => ({
          userId,
          amount: Math.floor((numericAmount * (parseInt(percentages[userId] || "0") || 0)) / 100),
        }));
      }
      case "by_item": {
        return ids.map((userId) => {
          const userItems = items.flatMap((item) =>
            item.assignedTo.includes(userId)
              ? [{ userId, numerator: 1, resolvedAmount: parseInt(item.amount.replace(/\D/g, "")) || 0 }]
              : []
          );
          const total = userItems.reduce((sum, it) => sum + (it.resolvedAmount || 0), 0);
          return { userId, amount: total };
        });
      }
      default:
        return [];
    }
  }

  function buildItems(): AddExpenseItemInput[] | undefined {
    if (tab !== "by_item") return undefined;
    return items
      .filter((item) => item.label && item.amount)
      .map((item) => ({
        label: item.label,
        amount: parseInt(item.amount.replace(/\D/g, "")) || 0,
        assignments: item.assignedTo.map((userId) => ({ userId, numerator: 1 })),
      }));
  }

  const isValid = useMemo(() => {
    if (!description.trim() || numericAmount === 0) return false;
    if (tab === "percentage" && totalPercentage !== 100) return false;
    if (tab === "by_item" && itemsTotal !== numericAmount) return false;
    return true;
  }, [description, numericAmount, tab, totalPercentage, itemsTotal]);

  function handleSubmit() {
    if (!isValid) return;
    const legs = buildLegs();
    addExpense.mutate(
      {
        budgetId,
        paidBy: currentUserId ?? "",
        totalAmount: numericAmount,
        description: description.trim(),
        expenseDate,
        splitMethod: tab as SplitMethod,
        legs,
        items: buildItems(),
      },
      {
        onSuccess: () => {
          toast.success("Expense added");
          handleClose();
        },
        onError: () => toast.error("Failed to add expense"),
      }
    );
  }

  function handleClose() {
    setAmount("");
    setDescription("");
    setTab("equal");
    setCustomAmounts({});
    setWeights({});
    setPercentages({});
    setItems([]);
    onOpenChange(false);
  }

  function toggleParticipant(id: string) {
    setSelectedParticipantIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  }

  function addItem() {
    setItems((prev) => [...prev, { label: "", amount: "", assignedTo: selectedParticipantIds }]);
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function updateItem(index: number, field: "label" | "amount", value: string) {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  }

  function toggleItemAssignment(itemIndex: number, userId: string) {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== itemIndex) return item;
        const assignedTo = item.assignedTo.includes(userId)
          ? item.assignedTo.filter((id) => id !== userId)
          : [...item.assignedTo, userId];
        return { ...item, assignedTo };
      })
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg flex flex-col p-0">
        <SheetHeader className="shrink-0 border-b border-border/60 px-5 py-4">
          <SheetTitle>Add expense</SheetTitle>
        </SheetHeader>

        <SheetBody className="flex-1 overflow-y-auto space-y-5 px-5 py-4">
          {/* Amount input */}
          <AmountInput
            value={amount}
            onChange={setAmount}
            currency="₫"
            placeholder="0"
            className="py-4"
          />

          {/* Description */}
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What was this for?"
            className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />

          {/* Per-person preview */}
          {numericAmount > 0 && selectedParticipantIds.length > 0 && tab === "equal" && (
            <p className="text-sm text-muted-foreground text-center">
              {formatVND(perPersonAmount)} per person
            </p>
          )}

          {/* Tabs */}
          <SegmentedControl
            options={TABS}
            value={tab}
            onChange={(v) => setTab(v as Tab)}
          />

          {/* Tab content */}
          {tab === "equal" && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-foreground">Split equally</p>
              <div className="flex flex-wrap gap-2">
                {participants?.map((p) => (
                  <button
                    key={p.participantId}
                    onClick={() => toggleParticipant(p.participantId)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-all",
                      selectedParticipantIds.includes(p.participantId)
                        ? "bg-[#0d9488] text-white"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    )}
                  >
                    {p.displayName}
                    {selectedParticipantIds.includes(p.participantId) && (
                      <X className="h-3 w-3" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {tab === "custom" && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-foreground">Custom amounts</p>
              <div className="space-y-2">
                {selectedParticipantIds.map((id) => {
                  const participant = participants?.find((p) => p.participantId === id);
                  return (
                    <div key={id} className="flex items-center gap-3">
                      <span className="text-sm w-24 truncate">{participant?.displayName ?? id}</span>
                      <input
                        type="text"
                        value={customAmounts[id] ?? ""}
                        onChange={(e) =>
                          setCustomAmounts((prev) => ({ ...prev, [id]: e.target.value }))
                        }
                        placeholder="0"
                        className="flex-1 rounded-xl border border-border bg-card px-3 py-2 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between text-sm pt-2 border-t border-border/60">
                <span className="text-muted-foreground">Total</span>
                <span className={cn(
                  "tabular-nums font-medium",
                  Object.values(customAmounts).reduce((s, v) => s + (parseInt(v?.replace(/\D/g, "") || "0"), 0), 0) === numericAmount
                    ? "text-emerald-600"
                    : "text-red-600"
                )}>
                  {formatVND(
                    Object.values(customAmounts).reduce(
                      (s, v) => s + (parseInt(v?.replace(/\D/g, "") || "0"), 0),
                      0
                    )
                  )}
                </span>
              </div>
            </div>
          )}

          {tab === "weighted" && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-foreground">Weighted split</p>
              <div className="space-y-2">
                {selectedParticipantIds.map((id) => {
                  const participant = participants?.find((p) => p.participantId === id);
                  return (
                    <div key={id} className="flex items-center gap-3">
                      <span className="text-sm w-24 truncate">{participant?.displayName ?? id}</span>
                      <input
                        type="number"
                        value={weights[id] ?? ""}
                        onChange={(e) =>
                          setWeights((prev) => ({ ...prev, [id]: e.target.value }))
                        }
                        placeholder="0"
                        className="flex-1 rounded-xl border border-border bg-card px-3 py-2 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                      <span className="text-sm text-muted-foreground">
                        → {totalWeight > 0 ? formatVND(Math.floor((numericAmount * (parseInt(weights[id] || "0") || 0)) / totalWeight)) : "—"}
                      </span>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">Total weight: {totalWeight}</p>
            </div>
          )}

          {tab === "percentage" && (
            <div className="space-y-3">
              <div className="flex justify-between">
                <p className="text-sm font-medium text-foreground">Percentage split</p>
                <span className={cn(
                  "text-sm tabular-nums font-medium",
                  totalPercentage === 100 ? "text-emerald-600" : "text-red-600"
                )}>
                  {totalPercentage}%
                </span>
              </div>
              <div className="space-y-2">
                {selectedParticipantIds.map((id) => {
                  const participant = participants?.find((p) => p.participantId === id);
                  return (
                    <div key={id} className="flex items-center gap-3">
                      <span className="text-sm w-24 truncate">{participant?.displayName ?? id}</span>
                      <input
                        type="number"
                        value={percentages[id] ?? ""}
                        onChange={(e) =>
                          setPercentages((prev) => ({ ...prev, [id]: e.target.value }))
                        }
                        placeholder="0"
                        min="0"
                        max="100"
                        className="flex-1 rounded-xl border border-border bg-card px-3 py-2 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                      <span className="text-sm text-muted-foreground">%</span>
                      <span className="text-sm text-muted-foreground w-20 text-right">
                        {parseInt(percentages[id] || "0") > 0
                          ? formatVND(Math.floor((numericAmount * parseInt(percentages[id] || "0")) / 100))
                          : "—"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {tab === "by_item" && (
            <div className="space-y-3">
              <div className="flex justify-between">
                <p className="text-sm font-medium text-foreground">Items</p>
                <span className={cn(
                  "text-sm tabular-nums font-medium",
                  itemsTotal === numericAmount ? "text-emerald-600" : "text-red-600"
                )}>
                  Total: {formatVND(itemsTotal)} / {formatVND(numericAmount)}
                </span>
              </div>

              <div className="space-y-3">
                {items.map((item, itemIndex) => (
                  <div key={itemIndex} className="space-y-2 p-3 rounded-xl bg-muted/50">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={item.label}
                        onChange={(e) => updateItem(itemIndex, "label", e.target.value)}
                        placeholder="Item name"
                        className="flex-1 rounded-lg border border-border bg-card px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                      <input
                        type="text"
                        value={item.amount}
                        onChange={(e) => updateItem(itemIndex, "amount", e.target.value)}
                        placeholder="0"
                        className="w-28 rounded-lg border border-border bg-card px-2 py-1.5 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                      <button
                        onClick={() => removeItem(itemIndex)}
                        className="p-1.5 text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {selectedParticipantIds.map((id) => {
                        const participant = participants?.find((p) => p.participantId === id);
                        return (
                          <button
                            key={id}
                            onClick={() => toggleItemAssignment(itemIndex, id)}
                            className={cn(
                              "text-xs px-2 py-0.5 rounded-full transition-all",
                              item.assignedTo.includes(id)
                                ? "bg-[#0d9488] text-white"
                                : "bg-muted text-muted-foreground"
                            )}
                          >
                            {participant?.displayName ?? id}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <Button variant="outline" size="sm" onClick={addItem} className="w-full">
                <Plus className="h-4 w-4 mr-1.5" />
                Add item
              </Button>
            </div>
          )}
        </SheetBody>

        <SheetFooter className="shrink-0 border-t border-border/60 px-5 py-4">
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClose} disabled={addExpense.isPending}>
              Cancel
            </Button>
            <Button
              variant="default"
              onClick={handleSubmit}
              disabled={!isValid || addExpense.isPending}
              className="flex-1"
            >
              {addExpense.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                  Adding...
                </>
              ) : (
                "Add expense"
              )}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}