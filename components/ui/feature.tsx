import type { ReactNode } from "react";
import { isFeatureEnabled, type FeatureFlag } from "@/lib/features";

/** Renders children only when the feature flag is on (else `fallback`). */
export function Feature({
  flag,
  children,
  fallback = null,
}: {
  flag: FeatureFlag;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  return <>{isFeatureEnabled(flag) ? children : fallback}</>;
}
