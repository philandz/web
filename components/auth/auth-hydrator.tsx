"use client";

import { useEffect } from "react";

import { useAuthStore } from "@/lib/auth-store";

/**
 * Force-flips `useAuthStore.hydrated` to true on first mount.
 *
 * Zustand's persist middleware only invokes `onRehydrateStorage` when
 * localStorage has data, so a fresh user lands with `hydrated: false`
 * and every auth-gated layout stalls on "Loading…". Re-asserting on
 * mount is harmless for users who already have a persisted session —
 * their state was already restored synchronously on store creation.
 */
export function AuthHydrator() {
  useEffect(() => {
    useAuthStore.setState({ hydrated: true });
  }, []);

  return null;
}
