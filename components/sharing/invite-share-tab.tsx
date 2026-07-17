"use client";

import { useTranslations } from "next-intl";
import {
  Link2,
  Mail,
  MessageCircle,
  MessageSquare,
  Smartphone,
  Copy,
  Check,
} from "lucide-react";
import { useToast } from "@/components/state/toast-provider";
import { cn } from "@/lib/utils";

type InviteShareTabProps = {
  link: string;
  budgetName: string;
}

type ShareTarget = {
  key: "zalo" | "whatsapp" | "email" | "sms" | "copy";
  Icon: typeof Mail;
  href?: (url: string, message: string) => string;
  onClick?: (url: string, message: string) => void;
};

export function InviteShareTab({ link, budgetName }: InviteShareTabProps) {
  const t = useTranslations("sharing");
  const toast = useToast();

  const message = t("invite.shareMessage", { url: link });

  const targets: ShareTarget[] = [
    {
      key: "zalo",
      Icon: MessageCircle,
      href: (url) =>
        // Zalo supports ?text= (shown in share sheet) but no URL preload
        // through the standard share intent. We use the encoded message.
        `https://zalo.me/share?u=${encodeURIComponent(url)}&t=${encodeURIComponent(message)}`,
    },
    {
      key: "whatsapp",
      Icon: MessageSquare,
      href: (_url, msg) => `https://wa.me/?text=${encodeURIComponent(msg)}`,
    },
    {
      key: "email",
      Icon: Mail,
      href: (_url, msg) =>
        `mailto:?subject=${encodeURIComponent(t("invite.title", { budget: budgetName }))}&body=${encodeURIComponent(msg)}`,
    },
    {
      key: "sms",
      Icon: Smartphone,
      href: (_url, msg) => `sms:?body=${encodeURIComponent(msg)}`,
    },
    {
      key: "copy",
      Icon: Link2,
      onClick: async (url) => {
        try {
          await navigator.clipboard.writeText(url);
          toast.success(t("invite.copied"));
        } catch {
          /* noop */
        }
      },
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-3 px-6 pb-4 sm:grid-cols-5">
      {targets.map(({ key, Icon, href, onClick }) => {
        const className = cn(
          "surface-soft flex flex-col items-center gap-2 rounded-2xl border border-border/60 px-3 py-4 transition-all hover-lift",
          "text-foreground/80 hover:text-foreground",
        );
        const label = t(`invite.share.${key}`);
        const content = (
          <>
            <Icon className="h-6 w-6" strokeWidth={1.75} />
            <span className="text-xs font-medium">{label}</span>
          </>
        );
        if (href) {
          return (
            <a
              key={key}
              href={href(link, message)}
              target="_blank"
              rel="noopener noreferrer"
              className={className}
              aria-label={label}
            >
              {content}
            </a>
          );
        }
        return (
          <button
            key={key}
            type="button"
            onClick={() => onClick?.(link, message)}
            className={className}
            aria-label={label}
          >
            {content}
          </button>
        );
      })}
    </div>
  );
}