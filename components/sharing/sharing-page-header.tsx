"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { ArrowLeft, Plus, Share2, UserPlus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AvatarStack } from "@/components/ui/avatar-stack";
import { AnimatedAmount } from "@/components/sharing/animated-amount";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { Link } from "@/i18n/navigation";
import { routes } from "@/constants/routes";
import { cn } from "@/lib/utils";

type Participant = {
  participantId: string;
  displayName: string;
  kind: "MEMBER" | "GUEST" | number;
};

type SharingPageHeaderProps = {
  budgetId: string;
  budgetName?: string;
  currency: string;
  totalSpent: number;
  participants: Participant[];
  isLoading?: boolean;
  canInvite?: boolean;
  onInviteClick: () => void;
  onAddExpenseClick: () => void;
};

export function SharingPageHeader({
  budgetId,
  budgetName,
  currency,
  totalSpent,
  participants,
  isLoading = false,
  canInvite = true,
  onInviteClick,
  onAddExpenseClick,
}: SharingPageHeaderProps) {
  const t = useTranslations("sharing");

  const avatarUsers = useMemo(
    () =>
      participants.slice(0, 5).map((p) => ({
        id: p.participantId,
        displayName: p.displayName,
        avatar: null,
      })),
    [participants],
  );

  return (
    <div className="surface-panel sticky top-0 z-30 overflow-hidden border-b border-border/60 backdrop-blur-md">
      {/* Amber stripe — matches the sharing type accent across the app */}
      <div className="h-1 bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500" />

      <div className="px-4 py-3 sm:px-6 sm:py-4">
        {/* Breadcrumb back-link */}
        <div className="mb-2">
          <Link
            href={routes.budgets}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {t("header.backToSharing")}
          </Link>
        </div>

        {/* Main row */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          {/* Icon + name */}
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/12 text-amber-600 dark:text-amber-400">
              <Share2 className="h-5 w-5" strokeWidth={1.75} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-lg font-semibold tracking-tight text-foreground sm:text-xl">
                  {budgetName ?? t("budget.title")}
                </h1>
                <Badge
                  variant="outline"
                  className="border-amber-200 bg-amber-500/10 text-[10px] text-amber-600 dark:border-amber-800 dark:text-amber-400 sm:text-xs"
                >
                  {currency}
                </Badge>
                {participants.length > 0 && (
                  <span className="flex items-center gap-1 text-[11px] text-muted-foreground sm:text-xs">
                    <Users className="h-3 w-3" />
                    {participants.length}
                  </span>
                )}
              </div>
              {avatarUsers.length > 0 && (
                <div className="mt-1">
                  <AvatarStack users={avatarUsers} max={5} size="sm" />
                </div>
              )}
            </div>
          </div>

          {/* Right cluster: total + primary actions */}
          <div className="flex shrink-0 items-center justify-between gap-3 sm:justify-end">
            <div className="hidden md:block">
              <LanguageSwitcher compact />
            </div>

            <div className="flex flex-col items-start sm:items-end">
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                {t("budget.totalSpent")}
              </span>
              {isLoading ? (
                <div className="mt-1 h-7 w-28 animate-pulse rounded bg-muted" />
              ) : (
                <AnimatedAmount value={totalSpent} currency={currency} size="lg" />
              )}
            </div>

            <div className="flex items-center gap-2">
              {canInvite && (
                <Button
                  size="sm"
                  onClick={onInviteClick}
                  className="shadow-soft hover-lift"
                  aria-label={t("header.inviteAria")}
                >
                  <UserPlus className="mr-1.5 h-4 w-4" />
                  <span className="hidden sm:inline">{t("header.invite")}</span>
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={onAddExpenseClick}
                className={cn("shadow-soft", !canInvite && "ml-auto")}
              >
                <Plus className="mr-1.5 h-4 w-4" />
                <span className="hidden sm:inline">{t("header.addExpense")}</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}