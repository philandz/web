"use client";

import { useMemo } from "react";
import { useAuthStore } from "@/lib/auth-store";
import { useParticipantsQuery, useBudgetOrgId, useBatchIdentityNames } from "@/modules/sharing/hooks";

/**
 * Build a `userId → displayName` map for a sharing budget.
 *
 * The backend stores `paid_by`, `legs.user_id`, and settlement
 * `from_user_id` / `to_user_id` as raw identity user_ids (UUIDs),
 * and intentionally leaves `display_name` empty for those rows —
 * the UI is expected to resolve them locally.
 *
 * Resolution order (first match wins):
 *
 *   1. The current participants list (`sharing_participants`),
 *      keyed by `userId` (the identity user_id from the DB).
 *   2. The current user's auth profile (`useAuthStore().profile`),
 *      so the viewer always sees their own name even if the backend
 *      hasn't yet inserted their row.
 *   3. Every member of the budget's org, batch-loaded from
 *      identity's `ListOrgMembers` gRPC via `useBatchIdentityNames`.
 *      This is the fix for leg `user_id`s whose author never went
 *      through `assert_member` (so no `sharing_participants` row),
 *      or for cross-budget references.
 *   4. A `g_<uuid>` prefix → "Guest" fallback for guests.
 *
 * The returned `resolve(userId)` returns the resolved display name,
 * or the raw userId if nothing matched (so the row still renders
 * something instead of "undefined").
 */
export function useParticipantNameLookup(budgetId: string) {
  const { data: participants } = useParticipantsQuery(budgetId);
  const profile = useAuthStore((s) => s.profile);
  const authToken = useAuthStore((s) => s.token);
  // Guests have no JWT, so the budget service call would 401. Pass
  // hasAuthToken=false to skip the query entirely — they fall back to
  // participants list (step 1) and the "Guest" prefix fallback (step 4).
  const orgId = useBudgetOrgId(budgetId, Boolean(authToken));
  const identityMap = useBatchIdentityNames(orgId);

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

    // 3. Identity batch lookup — catches real users who don't have
    //    a sharing_participants row yet (e.g. a leg was written for
    //    a member before the budget ever received a list call).
    for (const [uid, name] of identityMap ?? new Map()) {
      if (uid && name && !m.has(uid)) {
        m.set(uid, name);
      }
    }

    return m;
  }, [participants, profile?.id, profile?.displayName, identityMap]);

  function resolve(userId: string | null | undefined): string {
    if (!userId) return "";
    if (map.has(userId)) return map.get(userId)!;
    if (userId.startsWith("g_")) return "Guest";
    return userId;
  }

  return { resolve, byId: map };
}
