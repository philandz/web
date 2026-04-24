"use client";

import Image from "next/image";
import { motion } from "motion/react";
import { useTranslations } from "next-intl";

const VIDEO_URL = "https://v2.philand.io.vn/api/public/cat.mp4";

// ─────────────────────────────────────────────────────────────────────────────
// Balance card
// ─────────────────────────────────────────────────────────────────────────────
function BalanceCard({ t }: { t: ReturnType<typeof useTranslations> }) {
  return (
    <motion.div
      className="relative overflow-hidden rounded-2xl border border-white/[0.09] bg-white/[0.045] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.07)] backdrop-blur-md"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.9, delay: 0.65, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* shimmer sweep */}
      <motion.div
        className="pointer-events-none absolute inset-0 -skew-x-12 bg-gradient-to-r from-transparent via-white/[0.055] to-transparent"
        initial={{ x: "-110%" }}
        animate={{ x: "210%" }}
        transition={{ duration: 2.2, delay: 1.5, repeat: Infinity, repeatDelay: 10, ease: "easeInOut" }}
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-medium tracking-wide text-white/45">{t("monthlyBalance")}</span>
        <span className="rounded-full border border-[#b8f04a]/35 bg-[#b8f04a]/12 px-2.5 py-0.5 text-[11px] font-semibold text-[#b8f04a]">
          +12.4%
        </span>
      </div>

      <p className="text-[27px] font-semibold tracking-tight text-white">$84,921.00</p>

      <div className="mt-4 space-y-1.5">
        <div className="flex justify-between text-[11px] text-white/30">
          <span>{t("progressLabel")}</span>
          <span>60%</span>
        </div>
        <div className="h-[3px] overflow-hidden rounded-full bg-white/[0.07]">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-[#b8f04a]/60 to-[#b8f04a]"
            initial={{ width: 0 }}
            animate={{ width: "60%" }}
            transition={{ duration: 1.3, delay: 1.0, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN EXPORT
// ─────────────────────────────────────────────────────────────────────────────
export function LoginHeroPanel() {
  const t = useTranslations("auth.shell");

  return (
    <section className="relative hidden overflow-hidden rounded-2xl lg:block">

      {/* ── Video background — fills the entire panel ─────────────────────── */}
      <video
        className="absolute inset-0 h-full w-full object-cover"
        src={VIDEO_URL}
        autoPlay
        loop
        muted
        playsInline
      />

      {/* ── Dark overlay so text stays readable over the video ────────────── */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/55 via-black/30 to-black/70" />

      {/* ── Inner vignette ────────────────────────────────────────────────── */}
      <div
        className="pointer-events-none absolute inset-0 rounded-2xl"
        style={{ boxShadow: "inset 0 0 80px rgba(0,0,0,0.5)" }}
      />

      {/* ── Content ───────────────────────────────────────────────────────── */}
      <div className="relative z-10 flex h-full flex-col justify-between p-8 lg:p-9">

        {/* Top — headline (moved from center to top) */}
        <motion.div
          className="space-y-4"
          initial={{ opacity: 0, y: -14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.85, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* accent rule */}
          <motion.div
            className="h-px w-10 origin-left bg-gradient-to-r from-[#b8f04a]/85 to-transparent"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.8, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
          />

          <h2 className="max-w-[300px] text-[34px] font-semibold leading-[1.1] tracking-[-0.022em] text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.6)]">
            {t("heroTitle")}
          </h2>

          <p className="max-w-[260px] text-[13px] leading-[1.65] text-white/60 drop-shadow-[0_1px_6px_rgba(0,0,0,0.8)]">
            {t("heroDescription")}
          </p>
        </motion.div>

        {/* Spacer — video fills the middle */}
        <div className="flex-1" />

        {/* Bottom — balance card */}
        <BalanceCard t={t} />
      </div>
    </section>
  );
}
