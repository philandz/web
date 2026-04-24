"use client";

import { useEffect, useMemo, useState } from "react";

import { cn } from "@/lib/utils";

type UserAvatarProps = {
  name?: string;
  src?: string | null;
  size?: number;
  className?: string;
  fallbackClassName?: string;
  title?: string;
};

const AVATAR_PALETTES = [
  "bg-violet-500/20 text-violet-600 dark:text-violet-400",
  "bg-blue-500/20 text-blue-600 dark:text-blue-400",
  "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400",
  "bg-amber-500/20 text-amber-600 dark:text-amber-400",
  "bg-rose-500/20 text-rose-600 dark:text-rose-400",
  "bg-cyan-500/20 text-cyan-600 dark:text-cyan-400",
  "bg-orange-500/20 text-orange-600 dark:text-orange-400",
  "bg-teal-500/20 text-teal-600 dark:text-teal-400",
  "bg-pink-500/20 text-pink-600 dark:text-pink-400",
  "bg-indigo-500/20 text-indigo-600 dark:text-indigo-400",
];

function hashName(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return h;
}

export function UserAvatar({ name, src, size = 32, className, fallbackClassName, title }: UserAvatarProps) {
  const [hasError, setHasError] = useState(false);
  useEffect(() => {
    setHasError(false);
  }, [src]);

  const initials = useMemo(() => {
    const label = name?.trim() || "U";
    return label
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("");
  }, [name]);

  const colorClass = useMemo(() => {
    const seed = name?.trim() || "U";
    return AVATAR_PALETTES[hashName(seed) % AVATAR_PALETTES.length];
  }, [name]);

  const showImage = Boolean(src && src.trim().length > 0 && !hasError);

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold",
        !showImage && colorClass,
        className,
      )}
      style={{ width: size, height: size }}
      title={title ?? name}
    >
      {showImage ? (
        <img
          src={src ?? ""}
          alt={name ?? "User avatar"}
          className="h-full w-full object-cover"
          onError={() => setHasError(true)}
        />
      ) : (
        <span className={cn("leading-none", fallbackClassName)}>{initials}</span>
      )}
    </span>
  );
}
