"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link2, QrCode, Share2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useGenerateJoinLinkMutation } from "@/modules/sharing/hooks";
import { InviteLinkTab } from "./invite-link-tab";
import { InviteQrTab } from "./invite-qr-tab";
import { InviteShareTab } from "./invite-share-tab";

type InviteMemberDialogProps = {
  budgetId: string;
  budgetName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function InviteMemberDialog({
  budgetId,
  budgetName,
  open,
  onOpenChange,
}: InviteMemberDialogProps) {
  const t = useTranslations("sharing");
  const generate = useGenerateJoinLinkMutation();
  const [activeTab, setActiveTab] = useState("link");

  // Build absolute link from the backend's relative path.
  const link = generate.data?.joinUrl
    ? (typeof window !== "undefined" ? window.location.origin : "") +
      generate.data.joinUrl
    : "";

  function handleGenerate() {
    generate.mutate(budgetId);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 overflow-hidden">
        <DialogHeader className="border-b border-border/60 px-6 py-4">
          <DialogTitle className="flex items-center gap-2">
            <UserPlusIcon />
            {t("invite.title", { budget: budgetName })}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="border-b border-border/60 px-6 pt-3">
            <TabsList className="w-full grid grid-cols-3">
              <TabsTrigger value="link">
                <Link2 className="mr-1.5 h-4 w-4" />
                {t("invite.tabLink")}
              </TabsTrigger>
              <TabsTrigger value="qr">
                <QrCode className="mr-1.5 h-4 w-4" />
                {t("invite.tabQr")}
              </TabsTrigger>
              <TabsTrigger value="share">
                <Share2 className="mr-1.5 h-4 w-4" />
                {t("invite.tabShare")}
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="link" className="mt-0">
            {!link && !generate.isPending && (
              <div className="px-6 py-8 text-center">
                <p className="text-sm text-muted-foreground">
                  {t("invite.regenerateConfirm")}
                </p>
                <button
                  type="button"
                  onClick={handleGenerate}
                  className="mt-3 inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-soft hover-lift"
                >
                  {t("invite.regenerate")}
                </button>
              </div>
            )}
            {(link || generate.isPending) && (
              <InviteLinkTab
                link={link}
                expiresAt={generate.data?.expiresAt ?? 0}
                isGenerating={generate.isPending}
                onRegenerate={handleGenerate}
              />
            )}
          </TabsContent>

          <TabsContent value="qr" className="mt-0">
            {!link ? (
              <div className="px-6 py-8 text-center">
                <button
                  type="button"
                  onClick={handleGenerate}
                  className="inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-soft hover-lift"
                >
                  {t("invite.regenerate")}
                </button>
              </div>
            ) : (
              <InviteQrTab
                link={link}
                expiresAt={generate.data?.expiresAt ?? 0}
              />
            )}
          </TabsContent>

          <TabsContent value="share" className="mt-0">
            {!link ? (
              <div className="px-6 py-8 text-center">
                <button
                  type="button"
                  onClick={handleGenerate}
                  className="inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-soft hover-lift"
                >
                  {t("invite.regenerate")}
                </button>
              </div>
            ) : (
              <InviteShareTab link={link} budgetName={budgetName} />
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function UserPlusIcon() {
  return (
    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-4 w-4"
      >
        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="8.5" cy="7" r="4" />
        <line x1="20" y1="8" x2="20" y2="14" />
        <line x1="23" y1="11" x2="17" y2="11" />
      </svg>
    </span>
  );
}