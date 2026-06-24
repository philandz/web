"use client";

import { useTranslations } from "next-intl";
import { QRCodeSVG } from "qrcode.react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

type InviteQrTabProps = {
  link: string;
  expiresAt: number;
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

export function InviteQrTab({ link, expiresAt }: InviteQrTabProps) {
  const t = useTranslations("sharing");
  const timeLeft = expiresAt ? formatTimeLeft(expiresAt) : null;

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