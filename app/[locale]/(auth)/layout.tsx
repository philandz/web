"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";

import { PageLoadingState } from "@/components/state/page-loading-state";
import { useRouter } from "@/i18n/navigation";
import { useAuthStore } from "@/lib/auth-store";
import { getPublicAuthRedirect } from "@/modules/auth/route-guards";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const tCommon = useTranslations("common.states");
  const router = useRouter();
  const token = useAuthStore((state) => state.token);
  const userType = useAuthStore((state) => state.userType);
  const selectedOrgId = useAuthStore((state) => state.selectedOrgId);

  const redirectTo = getPublicAuthRedirect({ token, userType, selectedOrgId });

  useEffect(() => {
    if (redirectTo) {
      router.replace(redirectTo);
    }
  }, [redirectTo, router]);

  if (redirectTo) {
    return <PageLoadingState message={tCommon("redirecting")} />;
  }

  return children;
}
