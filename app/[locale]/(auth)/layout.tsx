"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";

import { PageLoadingState } from "@/components/state/page-loading-state";
import { useRouter } from "@/i18n/navigation";
import { useAuthStore } from "@/lib/auth-store";
import { getPublicAuthRedirect } from "@/modules/auth/route-guards";
import { sanitizeReturnTo } from "@/modules/auth/return-to";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const tCommon = useTranslations("common.states");
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = useAuthStore((state) => state.token);
  const userType = useAuthStore((state) => state.userType);
  const selectedOrgId = useAuthStore((state) => state.selectedOrgId);

  const returnTo = sanitizeReturnTo(searchParams.get("return_to"));
  const redirectTo = getPublicAuthRedirect(
    { token, userType, selectedOrgId },
    { returnTo }
  );

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
