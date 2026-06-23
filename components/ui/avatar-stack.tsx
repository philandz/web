"use client";

import { UserAvatar } from "@/components/ui/user-avatar";

type AvatarStackUser = {
  id: string;
  displayName: string;
  avatar?: string | null;
};

type AvatarStackProps = {
  users: AvatarStackUser[];
  max?: number;
  size?: "sm" | "md" | "lg";
};

const sizeMap = {
  sm: 24,
  md: 32,
  lg: 40,
};

const badgeSizeMap = {
  sm: "w-6 h-6",
  md: "w-8 h-8",
  lg: "w-10 h-10",
};

export function AvatarStack({ users, max = 5, size = "md" }: AvatarStackProps) {
  const visibleCount = Math.min(users.length, max);
  const visibleUsers = users.slice(0, visibleCount);
  const overflow = users.length - visibleCount;

  const avatarSize = sizeMap[size];
  const badgeSizeClass = badgeSizeMap[size];

  return (
    <div className="flex items-center">
      {visibleUsers.map((user, index) => (
        <div
          key={user.id}
          className={`relative ${index !== 0 ? "-ml-2" : ""}`}
          style={{ zIndex: visibleUsers.length - index }}
        >
          <UserAvatar
            name={user.displayName}
            src={user.avatar}
            size={avatarSize}
            className="ring-2 ring-background"
          />
        </div>
      ))}
      {overflow > 0 && (
        <div
          className={`relative -ml-2 flex items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground ring-2 ring-background ${badgeSizeClass}`}
          style={{ zIndex: 0 }}
        >
          +{overflow}
        </div>
      )}
    </div>
  );
}
