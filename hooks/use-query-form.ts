"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { usePathname } from "@/i18n/navigation";

interface UseQueryFormOptions<T> {
  /** Produce a fresh default draft (factory function) */
  defaultFactory: () => T;
  /** Parse URL search params into the applied/committed state */
  parseUrl: (sp: URLSearchParams) => T;
  /** Serialize applied state into a URLSearchParams (mutates in place) */
  serialize: (applied: T, sp: URLSearchParams) => void;
  /** Validate draft; return { ok, errors } */
  validate: (draft: T) => { ok: boolean; errors: Record<string, string> };
}

export interface UseQueryFormResult<T> {
  draft: T;
  applied: T;
  /** Merge partial draft changes (no URL write) */
  setDraft: (partial: Partial<T>) => void;
  /** Validate draft → copy to applied → write URL → caller should refetch */
  applySearch: () => { ok: boolean; errors: Record<string, string> };
  /** Reset draft to match applied */
  resetDraft: () => void;
  /** Populate applied from URL, then reset draft to applied */
  hydrateFromUrl: () => void;
  /** True when draft differs from applied */
  hasDraftChanges: boolean;
}

/**
 * Generic Draft / Applied state hook with URL synchronization.
 *
 * - `draft` = user's in-progress edits (mutates on every interaction)
 * - `applied` = last executed search (drives the network request)
 * - URL is the serialized form of `applied`
 *
 * Hook does NOT own React Query — callers use `applied` in their query keys
 * so any change to `applied` automatically triggers a refetch.
 *
 * @param TDraft - The concrete state type (same as TApplied for this use case)
 */
export function useQueryForm<T>(
  opts: UseQueryFormOptions<T>,
): UseQueryFormResult<T> {
  const { defaultFactory, parseUrl, serialize, validate } = opts;

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Applied = the last committed state (used to build query keys)
  const [applied, setApplied] = useState<T>(() => parseUrl(searchParams));

  // Draft = in-progress user edits
  const [draft, setDraftState] = useState<T>(() => parseUrl(searchParams));

  /** Merge partial changes into the draft (no URL mutation) */
  const setDraft = useCallback((partial: Partial<T>) => {
    setDraftState((prev) => ({ ...prev, ...partial }));
  }, []);

  /** Validate → copy draft to applied → write URL → return validation result */
  const applySearch = useCallback((): { ok: boolean; errors: Record<string, string> } => {
    const v = validate(draft);
    if (!v.ok) return v;

    setApplied(draft);

    // Write applied to URL
    const sp = new URLSearchParams(searchParams.toString());
    serialize(draft, sp);
    const qs = sp.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });

    return { ok: true, errors: {} };
  }, [draft, pathname, router, searchParams, serialize, validate]);

  /** Reset draft to match the current applied state */
  const resetDraft = useCallback(() => {
    setDraftState(applied);
  }, [applied]);

  /** Re-read URL into applied, then reset draft to applied */
  const hydrateFromUrl = useCallback(() => {
    const fromUrl = parseUrl(searchParams);
    setApplied(fromUrl);
    setDraftState(fromUrl);
  }, [parseUrl, searchParams]);

  const hasDraftChanges = useMemo(() => {
    return JSON.stringify(draft) !== JSON.stringify(applied);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, applied]);

  return {
    draft,
    applied,
    setDraft,
    applySearch,
    resetDraft,
    hydrateFromUrl,
    hasDraftChanges,
  };
}
