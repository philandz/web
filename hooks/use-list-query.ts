"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { usePathname } from "@/i18n/navigation";

interface Options<T> {
  /** Initial / default state, also what `reset()` returns to. */
  defaults: () => T;
  parse: (sp: URLSearchParams) => T;
  serialize: (value: T, sp: URLSearchParams) => void;
  /** Keep the state in the URL (shareable, survives F5). Otherwise it lives in memory. */
  persistInUrl: boolean;
}

export interface ListQuery<T> {
  query: T;
  /** Apply a change now. The page goes back to 1 unless the patch sets `page` itself. */
  update: (patch: Partial<T>) => void;
  /** Replace the whole state (e.g. after a range step). */
  replace: (next: T) => void;
  reset: () => void;
}

/**
 * Filter / sort / page state with no draft step: every change applies immediately. The URL is
 * the single source of truth when `persistInUrl` is on, so back/forward, F5 and shared links all
 * agree with what is on screen.
 */
export function useListQuery<T extends { page: number }>(opts: Options<T>): ListQuery<T> {
  const { defaults, parse, serialize, persistInUrl } = opts;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // In-memory mode keeps only what the user changed, so late-arriving defaults (e.g. the budget's
  // period) still apply until then.
  const [override, setOverride] = useState<T | null>(null);

  const urlKey = searchParams.toString();
  // `parse` is expected to be stable per context; the key makes URL changes re-parse.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const fromUrl = useMemo(() => parse(new URLSearchParams(urlKey)), [urlKey, parse]);
  const query = persistInUrl ? fromUrl : (override ?? defaults());

  const replace = useCallback(
    (next: T) => {
      if (!persistInUrl) {
        setOverride(next);
        return;
      }
      const sp = new URLSearchParams(window.location.search);
      serialize(next, sp);
      const qs = sp.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [persistInUrl, pathname, router, serialize],
  );

  const update = useCallback(
    (patch: Partial<T>) => {
      const next = { ...query, ...patch } as T;
      if (!("page" in patch)) next.page = 1;
      replace(next);
    },
    [query, replace],
  );

  const reset = useCallback(() => {
    if (persistInUrl) replace(defaults());
    else setOverride(null);
  }, [defaults, persistInUrl, replace]);

  return { query, update, replace, reset };
}
