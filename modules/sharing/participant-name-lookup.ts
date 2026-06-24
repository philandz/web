"use client";

import { useMemo } from "react";
import { useAuthStore } from "@/lib/auth-store";
import { useParticipantsQuery } from "@/modules/sharing/hooks";

/**
 * Build a `userId → displayName` map for a sharing budget.
 *
 * The backend stores `paid_by`, `legs.user_id`, and settlement
 * `from_user_id` / `to_user_id` as raw identity user_ids (UUIDs),
 * and intentionally leaves `display_name` empty for those rows —
 * the UI is expected to resolve them locally.
 *
 * This hook merges three sources, in priority order:
 *
 *   1. The current participants list (`sharing_participants`),
 *      keyed by `userId` (the identity user_id from the DB).
 *   2. The current user's auth profile (`useAuthStore().profile`),
 *      so the viewer always sees their own name even if the backend
 *      hasn't yet inserted their row.
 *   3. A "g_<uuid>" prefix → "Guest" fallback for guests.
 *
 * The returned `resolve(userId)` returns the resolved display name,
 * or the raw userId if nothing matched (so the row still renders
 * something instead of "undefined").
 */
export function useParticipantNameLookup(budgetId: string) {
  const { data: participants } = useParticipantsQuery(budgetId);
  const profile = useAuthStore((s) => s.profile);

  const map = useMemo(() => {
    const m = new Map<string, string>();

    // 1. Active participants from the DB, keyed by user_id.
    for (const p of participants ?? []) {
      if (p.userId && p.userId.length > 0) {
        m.set(p.userId, p.displayName);
      }
    }

    // 2. Current user's profile — covers the "owner missing from
    //    participants list" case before the backend upsert runs.
    if (profile?.id && profile.displayName) {
      const existing = m.get(profile.id);
      if (!existing || existing === profile.id) {
        m.set(profile.id, profile.displayName);
      }
    }

    return m;
  }, [participants, profile?.id, profile?.displayName]);

  function resolve(userId: string | null | undefined): string {
    if (!userId) return "";
    if (map.has(userId)) return map.get(userId)!;
    if (userId.startsWith("g_")) return "Guest";
    return userId;
  }

  return { resolve, byId: map };
}