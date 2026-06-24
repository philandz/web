"use client";

import { useTranslations } from "next-intl";
import { QRCodeSVG } from "qrcode.react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDuration, useFormatLocale } from "@/lib/format";

type InviteQrTabProps = {
  link: string;
  expiresAt: number;
};

function formatTimeLeft(expiresAt: number, locale: string): string {
  const ms = expiresAt * 1000 - Date.now();
  if (ms <= 0) return "";
  return formatDuration(ms, locale);
}

export function InviteQrTab({ link, expiresAt }: InviteQrTabProps) {
  const t = useTranslations("sharing");
  const locale = useFormatLocale();
  const timeLeft = expiresAt ? formatTimeLeft(expiresAt, locale) : null;

  // Inline SVG download: serialize the QR code so the user can save it.
  function handleDownload() {
    const svg = document.getElementById("invite-qr-svg");
    if (!svg) return;
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svg);
    const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "invite-qr.svg";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col items-center gap-3 px-6 pb-4">
      <div className="surface-soft flex items-center justify-center rounded-2xl border border-border/60 p-5">
        <QRCodeSVG
          id="invite-qr-svg"
          value={link}
          size={224}
          level="M"
          bgColor="transparent"
          fgColor="currentColor"
          className="text-foreground"
        />
      </div>
      {timeLeft && (
        <p className="text-xs text-muted-foreground">
          {t("invite.scanToJoin", { time: timeLeft })}
        </p>
      )}
      <Button
        size="sm"
        variant="outline"
        onClick={handleDownload}
        disabled={!link}
      >
        <Download className="mr-1.5 h-4 w-4" />
        {t("invite.downloadQr")}
      </Button>
    </div>
  );
}