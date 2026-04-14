"use client";

import { useEffect, useMemo, useState } from "react";

import { cn } from "@/lib/utils";

type UserAvatarProps = {
  name?: string;
  src?: string | null;
  size?: number;
  className?: string;
  fallbackClassName?: string;
};

export function UserAvatar({ name, src, size = 32, className, fallbackClassName }: UserAvatarProps) {
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

  const showImage = Boolean(src && src.trim().length > 0 && !hasError);

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center overflow-hidden rounded-full bg-highlight/25 font-semibold text-highlight",
        className
      )}
      style={{ width: size, height: size }}
    >
      {showImage ? (
        <img
          src={src ?? ""}
          alt={name ?? "User avatar"}
          className="h-full w-full object-cover"
          onError={() => setHasError(true)}
        />
      ) : (
        <span className={cn("text-[11px]", fallbackClassName)}>{initials}</span>
      )}
    </span>
  );
}
