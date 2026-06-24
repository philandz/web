"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Copy, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/state/toast-provider";

type InviteLinkTabProps = {
  link: string;
  expiresAt: number;
  isGenerating: boolean;
  onRegenerate: () => void;
};

function formatTimeLeft(expiresAt: number): string {
  const ms = expiresAt * 1000 - Date.now();
  if (ms <= 0) return "expired";
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 0) return `${days}d ${hours}h`;
  const mins = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

export function InviteLinkTab({
  link,
  expiresAt,
  isGenerating,
  onRegenerate,
}: InviteLinkTabProps) {
  const t = useTranslations("sharing");
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Reset copied state after 2s
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(t);
  }, [copied]);

  async function handleCopy() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast.success(t("invite.copied"));
    } catch {
      const el = document.getElementById("invite-link-input") as HTMLInputElement | null;
      el?.select();
    }
  }

  const timeLeft = expiresAt ? formatTimeLeft(expiresAt) : null;
  const expired = timeLeft === "expired";

  return (
    <div className="space-y-3 px-6 pb-4">
      <div className="flex items-center gap-2">
        <input
          id="invite-link-input"
          readOnly
          value={link}
          placeholder={isGenerating ? "Generating…" : ""}
          className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          onFocus={(e) => e.currentTarget.select()}
        />
        <Button
          size="sm"
          variant="outline"
          onClick={handleCopy}
          disabled={!link || expired}
          aria-label={t("invite.copyLink")}
        >
          {copied ? (
            <Check className="h-4 w-4 text-emerald-600" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </Button>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {timeLeft && !expired && t("invite.expiresIn", { time: timeLeft })}
          {expired && (
            <span className="text-destructive">{t("invite.expired")}</span>
          )}
        </span>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => (link ? setConfirmOpen(true) : onRegenerate())}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="mr-1 h-3.5 w-3.5" />
          )}
          {t("invite.regenerate")}
        </Button>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t("invite.regenerate")}
        description={t("invite.regenerateConfirm")}
        confirmLabel={t("invite.regenerate")}
        cancelLabel={t("form.cancel")}
        onConfirm={() => {
          setConfirmOpen(false);
          onRegenerate();
        }}
        destructive={false}
      />
    </div>
  );
}