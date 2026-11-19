import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { isFeatureEnabled } from "@/lib/features";
import { notificationKeys } from "@/lib/query-keys";
import {
  notificationService,
  type BroadcastInput,
  type BroadcastStatus,
  type NotificationKind,
  type PreferenceCell,
} from "@/services/notification-service";

/** Unread badge polls every minute (and on window focus); no SSE in the MVP. */
export const UNREAD_POLL_MS = 60_000;

export function useUnreadCountQuery(enabled = true) {
  const on = enabled && isFeatureEnabled("notifications");
  return useQuery({
    queryKey: notificationKeys.unread(),
    queryFn: () => notificationService.unreadCount(),
    enabled: on,
    refetchInterval: on ? UNREAD_POLL_MS : false,
    refetchOnWindowFocus: true,
    staleTime: 15_000,
  });
}

export function useInboxQuery(params: { filter: "all" | "unread"; kind?: NotificationKind; locale: string }, limit = 20) {
  return useInfiniteQuery({
    queryKey: notificationKeys.inbox({ ...params, limit }),
    queryFn: ({ pageParam }) => notificationService.listInbox({ ...params, limit, cursor: pageParam }),
    initialPageParam: "",
    getNextPageParam: (last) => last.nextCursor || undefined,
    enabled: isFeatureEnabled("notifications"),
  });
}

export function useBannersQuery(locale: string, enabled = true) {
  return useQuery({
    queryKey: notificationKeys.banners(locale),
    queryFn: () => notificationService.listBanners(locale),
    enabled: enabled && isFeatureEnabled("notifications"),
    refetchInterval: UNREAD_POLL_MS * 5,
    refetchOnWindowFocus: true,
  });
}

function useInvalidateInbox() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: notificationKeys.inboxAll() });
    void qc.invalidateQueries({ queryKey: notificationKeys.unread() });
    void qc.invalidateQueries({ queryKey: ["notifications", "banners"] });
  };
}

export function useMarkReadMutation() {
  const invalidate = useInvalidateInbox();
  return useMutation({
    mutationFn: (ids: { itemIds?: string[]; broadcastIds?: string[] }) => notificationService.markRead(ids),
    onSuccess: invalidate,
  });
}

export function useMarkAllReadMutation() {
  const invalidate = useInvalidateInbox();
  return useMutation({
    mutationFn: (kind?: NotificationKind) => notificationService.markAllRead(kind),
    onSuccess: invalidate,
  });
}

export function useArchiveMutation() {
  const invalidate = useInvalidateInbox();
  return useMutation({
    mutationFn: (ids: { itemIds?: string[]; broadcastIds?: string[] }) => notificationService.archive(ids),
    onSuccess: invalidate,
  });
}

export function usePreferencesQuery() {
  return useQuery({
    queryKey: notificationKeys.preferences(),
    queryFn: () => notificationService.getPreferences(),
    enabled: isFeatureEnabled("notifications"),
  });
}

export function useUpdatePreferencesMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (cells: Pick<PreferenceCell, "category" | "channel" | "enabled">[]) =>
      notificationService.updatePreferences(cells),
    onSuccess: (prefs) => qc.setQueryData(notificationKeys.preferences(), prefs),
  });
}

export function useSetBudgetMuteMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ budgetId, muted }: { budgetId: string; muted: boolean }) =>
      notificationService.setBudgetMute(budgetId, muted),
    onSuccess: (prefs) => qc.setQueryData(notificationKeys.preferences(), prefs),
  });
}

// --- super admin -------------------------------------------------------------

export function useAdminBroadcastsQuery(params: { status?: BroadcastStatus; page?: number; limit?: number } = {}) {
  return useQuery({
    queryKey: notificationKeys.adminBroadcasts(params),
    queryFn: () => notificationService.adminList(params),
    placeholderData: (prev) => prev,
  });
}

function useInvalidateAdmin() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: notificationKeys.adminBroadcastsAll() });
}

export function useCreateBroadcastMutation() {
  const invalidate = useInvalidateAdmin();
  return useMutation({
    mutationFn: (input: BroadcastInput) => notificationService.adminCreate(input),
    onSuccess: invalidate,
  });
}

export function useUpdateBroadcastMutation() {
  const invalidate = useInvalidateAdmin();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: BroadcastInput }) => notificationService.adminUpdate(id, input),
    onSuccess: invalidate,
  });
}

export function usePublishBroadcastMutation() {
  const invalidate = useInvalidateAdmin();
  return useMutation({
    mutationFn: (id: string) => notificationService.adminPublish(id),
    onSuccess: invalidate,
  });
}

export function useArchiveBroadcastMutation() {
  const invalidate = useInvalidateAdmin();
  return useMutation({
    mutationFn: (id: string) => notificationService.adminArchive(id),
    onSuccess: invalidate,
  });
}
