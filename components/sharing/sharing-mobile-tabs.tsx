"use client";

import { useTranslations } from "next-intl";
import { Wallet, Users, Receipt, History } from "lucide-react";
import { cn } from "@/lib/utils";

export type MobileTab = "members" | "expenses" | "settle" | "activity";

type SharingMobileTabsProps = {
  active: MobileTab;
  onChange: (tab: MobileTab) => void;
};

const TABS: { value: MobileTab; icon: typeof Wallet; key: string }[] = [
  { value: "members", icon: Users, key: "members" },
  { value: "expenses", icon: Receipt, key: "expenses" },
  { value: "settle", icon: Wallet, key: "settle" },
  { value: "activity", icon: History, key: "activity" },
];

export function SharingMobileTabs({ active, onChange }: SharingMobileTabsProps) {
  const t = useTranslations("sharing");
  return (
    <div className="lg:hidden sticky top-[57px] sm:top-[65px] z-20 -mx-4 mb-4 border-b border-border/60 bg-background/90 backdrop-blur-md px-4">
      <div role="tablist" className="no-scrollbar flex gap-1 overflow-x-auto py-1">
        {TABS.map(({ value, icon: Icon, key }) => {
          const isActive = active === value;
          return (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange(value)}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-all",
                isActive
                  ? "bg-amber-500/12 text-amber-600 dark:text-amber-400"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {t(`tabs.${key}`)}
            </button>
          );
        })}
      </div>
    </div>
  );
}