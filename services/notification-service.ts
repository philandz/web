import { apiClient } from "@/lib/http/client";

const BASE = "/api/notification";
const ADMIN_BASE = "/api/admin/notification";

// ---------------------------------------------------------------------------
// Types (the gateway emits lowercase labels, never raw protobuf enums)
// ---------------------------------------------------------------------------

export type NotificationCategory =
  | "activity"
  | "membership"
  | "reminder"
  | "alert"
  | "security"
  | "system";
export type NotificationSeverity = "info" | "warning" | "critical";
export type NotificationChannel = "in_app" | "email" | "telegram";
export type NotificationKind = "personal" | "system";
export type BroadcastAudience = "all" | "users" | "orgs";
export type BroadcastStatus = "draft" | "scheduled" | "published" | "archived";

export const NOTIFICATION_CATEGORIES: NotificationCategory[] = [
  "activity",
  "membership",
  "reminder",
  "alert",
  "security",
  "system",
];

export interface InboxItem {
  id: string;
  kind: NotificationKind;
  category: NotificationCategory;
  severity: NotificationSeverity;
  type: string;
  params: Record<string, unknown>;
  title: string;
  body: string;
  fallbackText: string;
  link: string;
  budgetId: string;
  groupCount: number;
  createdAt: number;
  isRead: boolean;
}

export interface InboxPage {
  items: InboxItem[];
  nextCursor: string;
}

export interface UnreadCount {
  personal: number;
  system: number;
  total: number;
}

export interface Banner {
  broadcastId: string;
  severity: NotificationSeverity;
  title: string;
  body: string;
  link: string;
  dismissible: boolean;
  expiresAt: number;
}

export interface PreferenceCell {
  category: NotificationCategory;
  channel: NotificationChannel;
  enabled: boolean;
  locked: boolean;
}

export interface Preferences {
  cells: PreferenceCell[];
  mutedBudgetIds: string[];
}

export interface Broadcast {
  id: string;
  audience: BroadcastAudience;
  audienceUserIds: string[];
  audienceOrgIds: string[];
  severity: NotificationSeverity;
  titleVi: string;
  bodyVi: string;
  titleEn: string;
  bodyEn: string;
  link: string;
  status: BroadcastStatus;
  publishAt: number;
  expiresAt: number;
  showBanner: boolean;
  createdAt: number;
  readCount: number;
}

export interface BroadcastInput {
  audience: BroadcastAudience;
  audienceUserIds?: string[];
  audienceOrgIds?: string[];
  severity: NotificationSeverity;
  titleVi: string;
  bodyVi: string;
  titleEn: string;
  bodyEn: string;
  link?: string;
  publishAt?: number;
  expiresAt?: number;
  showBanner?: boolean;
}

// ---------------------------------------------------------------------------
// Raw shapes
// ---------------------------------------------------------------------------

interface RawItem {
  id: string;
  kind: NotificationKind;
  category: NotificationCategory;
  severity: NotificationSeverity;
  type: string;
  params?: Record<string, unknown>;
  title?: string;
  body?: string;
  fallback_text?: string;
  link?: string;
  budget_id?: string;
  group_count?: number;
  created_at: number;
  is_read?: boolean;
}

interface RawBanner {
  broadcast_id: string;
  severity: NotificationSeverity;
  title: string;
  body: string;
  link?: string;
  dismissible?: boolean;
  expires_at?: number;
}

interface RawPrefs {
  cells?: PreferenceCell[];
  muted_budget_ids?: string[];
}

interface RawBroadcast {
  id: string;
  audience: BroadcastAudience;
  audience_user_ids?: string[];
  audience_org_ids?: string[];
  severity: NotificationSeverity;
  title_vi?: string;
  body_vi?: string;
  title_en?: string;
  body_en?: string;
  link?: string;
  status: BroadcastStatus;
  publish_at?: number;
  expires_at?: number;
  show_banner?: boolean;
  created_at?: number;
  read_count?: number;
}

// ---------------------------------------------------------------------------
// Mappers
// ---------------------------------------------------------------------------

/** Only same-origin relative paths may become a navigation target. */
export function safeLink(link: string | undefined): string {
  if (!link) return "";
  if (!link.startsWith("/") || link.startsWith("//") || link.includes("\\")) return "";
  return link;
}

export function mapItem(r: RawItem): InboxItem {
  return {
    id: r.id,
    kind: r.kind,
    category: r.category,
    severity: r.severity,
    type: r.type,
    params: r.params ?? {},
    title: r.title ?? "",
    body: r.body ?? "",
    fallbackText: r.fallback_text ?? "",
    link: safeLink(r.link),
    budgetId: r.budget_id ?? "",
    groupCount: r.group_count && r.group_count > 1 ? r.group_count : 1,
    createdAt: r.created_at,
    isRead: Boolean(r.is_read),
  };
}

export function mapBanner(r: RawBanner): Banner {
  return {
    broadcastId: r.broadcast_id,
    severity: r.severity,
    title: r.title,
    body: r.body,
    link: safeLink(r.link),
    dismissible: r.dismissible !== false && r.severity !== "critical",
    expiresAt: r.expires_at ?? 0,
  };
}

export function mapPrefs(r: RawPrefs): Preferences {
  return { cells: r.cells ?? [], mutedBudgetIds: r.muted_budget_ids ?? [] };
}

export function mapBroadcast(r: RawBroadcast): Broadcast {
  return {
    id: r.id,
    audience: r.audience,
    audienceUserIds: r.audience_user_ids ?? [],
    audienceOrgIds: r.audience_org_ids ?? [],
    severity: r.severity,
    titleVi: r.title_vi ?? "",
    bodyVi: r.body_vi ?? "",
    titleEn: r.title_en ?? "",
    bodyEn: r.body_en ?? "",
    link: r.link ?? "",
    status: r.status,
    publishAt: r.publish_at ?? 0,
    expiresAt: r.expires_at ?? 0,
    showBanner: Boolean(r.show_banner),
    createdAt: r.created_at ?? 0,
    readCount: r.read_count ?? 0,
  };
}

function toBroadcastBody(i: BroadcastInput) {
  return {
    audience: i.audience,
    audience_user_ids: i.audienceUserIds ?? [],
    audience_org_ids: i.audienceOrgIds ?? [],
    severity: i.severity,
    title_vi: i.titleVi,
    body_vi: i.bodyVi,
    title_en: i.titleEn,
    body_en: i.bodyEn,
    link: i.link ?? "",
    publish_at: i.publishAt ?? 0,
    expires_at: i.expiresAt ?? 0,
    show_banner: i.showBanner ?? false,
  };
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export interface InboxParams {
  filter?: "all" | "unread";
  kind?: NotificationKind;
  cursor?: string;
  limit?: number;
  locale?: string;
}

function qs(params: Record<string, string | number | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export const notificationService = {
  async listInbox(params: InboxParams = {}): Promise<InboxPage> {
    const raw = await apiClient.get<{ items?: RawItem[]; next_cursor?: string }>(
      `${BASE}/inbox${qs({ ...params })}`
    );
    return { items: (raw.items ?? []).map(mapItem), nextCursor: raw.next_cursor ?? "" };
  },

  async unreadCount(): Promise<UnreadCount> {
    const raw = await apiClient.get<Partial<UnreadCount>>(`${BASE}/unread-count`);
    return { personal: raw.personal ?? 0, system: raw.system ?? 0, total: raw.total ?? 0 };
  },

  async markRead(ids: { itemIds?: string[]; broadcastIds?: string[] }): Promise<void> {
    await apiClient.post(`${BASE}/read`, {
      item_ids: ids.itemIds ?? [],
      broadcast_ids: ids.broadcastIds ?? [],
    });
  },

  async markAllRead(kind?: NotificationKind): Promise<void> {
    await apiClient.post(`${BASE}/read-all`, kind ? { kind } : {});
  },

  async archive(ids: { itemIds?: string[]; broadcastIds?: string[] }): Promise<void> {
    await apiClient.post(`${BASE}/archive`, {
      item_ids: ids.itemIds ?? [],
      broadcast_ids: ids.broadcastIds ?? [],
    });
  },

  async listBanners(locale: string): Promise<Banner[]> {
    const raw = await apiClient.get<{ banners?: RawBanner[] }>(
      `${BASE}/banners${qs({ locale })}`
    );
    return (raw.banners ?? []).map(mapBanner);
  },

  async getPreferences(): Promise<Preferences> {
    return mapPrefs(await apiClient.get<RawPrefs>(`${BASE}/preferences`));
  },

  async updatePreferences(
    cells: Pick<PreferenceCell, "category" | "channel" | "enabled">[]
  ): Promise<Preferences> {
    return mapPrefs(await apiClient.put<RawPrefs>(`${BASE}/preferences`, { cells }));
  },

  async setBudgetMute(budgetId: string, muted: boolean): Promise<Preferences> {
    return mapPrefs(
      await apiClient.put<RawPrefs>(`${BASE}/budgets/${budgetId}/mute`, { muted })
    );
  },

  // --- super admin -----------------------------------------------------------

  async adminList(params: { status?: BroadcastStatus; page?: number; limit?: number } = {}) {
    const raw = await apiClient.get<{ broadcasts?: RawBroadcast[]; total?: number }>(
      `${ADMIN_BASE}/broadcasts${qs({ ...params })}`
    );
    return { broadcasts: (raw.broadcasts ?? []).map(mapBroadcast), total: raw.total ?? 0 };
  },

  async adminCreate(input: BroadcastInput): Promise<Broadcast> {
    return mapBroadcast(
      await apiClient.post<RawBroadcast>(`${ADMIN_BASE}/broadcasts`, toBroadcastBody(input))
    );
  },

  async adminUpdate(id: string, input: BroadcastInput): Promise<Broadcast> {
    return mapBroadcast(
      await apiClient.patch<RawBroadcast>(
        `${ADMIN_BASE}/broadcasts/${id}`,
        toBroadcastBody(input)
      )
    );
  },

  async adminPublish(id: string): Promise<Broadcast> {
    return mapBroadcast(
      await apiClient.post<RawBroadcast>(`${ADMIN_BASE}/broadcasts/${id}/publish`)
    );
  },

  async adminArchive(id: string): Promise<Broadcast> {
    return mapBroadcast(
      await apiClient.post<RawBroadcast>(`${ADMIN_BASE}/broadcasts/${id}/archive`)
    );
  },
};
