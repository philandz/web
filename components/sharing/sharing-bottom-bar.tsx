"use client";

import { useTranslations } from "next-intl";
import { Plus, UserPlus, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

type SharingBottomBarProps = {
  onInvite: () => void;
  onAddExpense: () => void;
  onMarkSettled: () => void;
  hasUnsettled?: boolean;
};

export function SharingBottomBar({
  onInvite,
  onAddExpense,
  onMarkSettled,
  hasUnsettled = false,
}: SharingBottomBarProps) {
  const t = useTranslations("sharing");

  return (
    <div className="fixed bottom-0 inset-x-0 z-40 lg:hidden border-t border-border/60 bg-background/95 backdrop-blur-md shadow-float">
      <div className="mx-auto flex max-w-5xl items-stretch gap-2 px-4 py-2.5 pb-[env(safe-area-inset-bottom)]">
        <button
          type="button"
          onClick={onInvite}
          className="flex flex-1 min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-border/60 bg-card/80 px-3 py-2.5 text-xs font-medium text-foreground hover-lift active:scale-[0.98] transition"
        >
          <UserPlus className="h-4 w-4" />
          {t("bottomBar.invite")}
        </button>
        <button
          type="button"
          onClick={onAddExpense}
          className="flex flex-[1.4] min-h-[44px] items-center justify-center gap-1.5 rounded-xl bg-primary px-3 py-2.5 text-xs font-semibold text-primary-foreground shadow-soft hover-lift active:scale-[0.98] transition"
        >
          <Plus className="h-4 w-4" />
          {t("bottomBar.addExpense")}
        </button>
        <button
          type="button"
          onClick={onMarkSettled}
          disabled={!hasUnsettled}
          className={cn(
            "flex flex-1 min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-border/60 bg-card/80 px-3 py-2.5 text-xs font-medium transition active:scale-[0.98]",
            hasUnsettled
              ? "text-foreground hover-lift"
              : "text-muted-foreground opacity-50 cursor-not-allowed",
          )}
        >
          <Wallet className="h-4 w-4" />
          {t("bottomBar.markSettled")}
        </button>
      </div>
    </div>
  );
}