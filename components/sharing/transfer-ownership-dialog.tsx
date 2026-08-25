"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Crown, AlertTriangle, Loader2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/user-avatar";
import { sharingService } from "@/services/sharing-service";
import type { ParticipantInfo } from "@/services/sharing-service";
import { useToast } from "@/components/state/toast-provider";
import { safeDisplayName } from "@/lib/safe-display-name";
import { ChevronDown } from "lucide-react";

type TransferOwnershipDialogProps = {
  budgetId: string;
  participants: ParticipantInfo[];
  currentUserId: string | null | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function TransferOwnershipDialog({
  budgetId,
  participants,
  currentUserId,
  open,
  onOpenChange,
}: TransferOwnershipDialogProps) {
  const t = useTranslations("sharing");
  const toast = useToast();
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Eligible members: non-guest, has a userId, and not the current user.
  const eligibleMembers = participants.filter(
    (p) =>
      !p.revoked &&
      (p.kind === "MEMBER" || (typeof p.kind === "number" && p.kind !== 2)) &&
      p.userId &&
      p.userId !== currentUserId,
  );

  const selectedMember = eligibleMembers.find((m) => m.userId === selectedUserId);

  function handleClose() {
    if (isSubmitting) return;
    setSelectedUserId("");
    onOpenChange(false);
  }

  async function handleSubmit() {
    if (!selectedUserId) return;
    setIsSubmitting(true);
    try {
      await sharingService.transferOwnership(budgetId, selectedUserId);
      toast.success(t("transferOwnership.success"));
      setSelectedUserId("");
      onOpenChange(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("backend RPC not yet implemented")) {
        toast.error(t("transferOwnership.notImplemented"));
      } else {
        toast.error(t("transferOwnership.error"));
      }
      // Keep dialog open on error so user can retry or cancel.
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400">
              <Crown className="h-4 w-4" />
            </span>
            {t("transferOwnership.title")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Member picker — native select styled to match design system */}
          <div className="space-y-1.5">
            <label
              className="text-xs font-medium text-muted-foreground"
              htmlFor="owner-select"
            >
              {t("transferOwnership.selectLabel")}
            </label>
            <div className="relative">
              <select
                id="owner-select"
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                disabled={isSubmitting}
                className="h-10 w-full appearance-none rounded-xl border border-input bg-background px-3 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="" disabled>
                  {t("transferOwnership.selectPlaceholder")}
                </option>
                {eligibleMembers.map((m) => (
                  <option key={m.participantId} value={m.userId ?? ""}>
                    {safeDisplayName(m.displayName)}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            </div>
          </div>

          {/* Selected member preview */}
          {selectedMember && (
            <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-muted/40 p-3">
              <UserAvatar
                name={safeDisplayName(selectedMember.displayName)}
                size={28}
              />
              <span className="text-sm font-medium">
                {safeDisplayName(selectedMember.displayName)}
              </span>
            </div>
          )}

          {/* Warning shown after selection */}
          {selectedMember && (
            <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-amber-700 dark:text-amber-400">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p className="text-xs leading-relaxed">
                {t("transferOwnership.warning", {
                  name: safeDisplayName(selectedMember.displayName),
                })}
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="mt-2">
          <Button
            variant="ghost"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            {t("form.cancel")}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedUserId || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                {t("form.confirm")}…
              </>
            ) : (
              t("transferOwnership.confirm")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
