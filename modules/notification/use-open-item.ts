import { useRouter } from "@/i18n/navigation";
import type { InboxItem } from "@/services/notification-service";

import { useMarkReadMutation } from "./hooks";

/** Marks an item read and follows its (already sanitised, relative) link. */
export function useOpenNotification(onNavigate?: () => void) {
  const router = useRouter();
  const markRead = useMarkReadMutation();

  return (item: InboxItem) => {
    if (!item.isRead) {
      markRead.mutate(item.kind === "system" ? { broadcastIds: [item.id] } : { itemIds: [item.id] });
    }
    if (item.link) {
      onNavigate?.();
      router.push(item.link);
    }
  };
}
