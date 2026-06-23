"use client";

import { useState } from "react";
import { Copy, Check, Link2, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useGenerateJoinLinkMutation } from "@/modules/sharing/hooks";

type InviteMemberDialogProps = {
  budgetId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function InviteMemberDialog({
  budgetId,
  open,
  onOpenChange,
}: InviteMemberDialogProps) {
  const generate = useGenerateJoinLinkMutation();
  const [copied, setCopied] = useState(false);

  const link = generate.data?.joinUrl ?? "";

  function handleGenerate() {
    setCopied(false);
    generate.mutate(budgetId);
  }

  async function handleCopy() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select the input so the user can Cmd-C manually.
      const el = document.getElementById("join-link-input") as HTMLInputElement | null;
      el?.select();
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Invite a member
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 px-6 pb-2 text-sm text-muted-foreground">
          <p>
            Share this link with anyone. They can open it in a browser
            (no account needed), pick a display name, and start adding
            expenses immediately. The link expires after 7 days.
          </p>

          <div className="flex items-center gap-2">
            <input
              id="join-link-input"
              readOnly
              value={link}
              placeholder={generate.isPending ? "Generating…" : "Click generate to create a link"}
              className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm font-mono text-foreground"
              onFocus={(e) => e.currentTarget.select()}
            />
            <Button
              size="sm"
              variant="outline"
              onClick={handleCopy}
              disabled={!link}
              aria-label="Copy link"
            >
              {copied ? (
                <Check className="h-4 w-4 text-emerald-600" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
          <Button onClick={handleGenerate} disabled={generate.isPending}>
            {generate.isPending ? (
              <>
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                Generating…
              </>
            ) : generate.data ? (
              "Generate new link"
            ) : (
              "Generate link"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
