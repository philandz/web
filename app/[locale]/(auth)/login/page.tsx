"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSearchParams } from "next/navigation";

import { AuthButton } from "@/components/auth/auth-button";
import { AuthInput } from "@/components/auth/auth-input";
import { AuthShell } from "@/components/auth/auth-shell";
import { InlineAlert } from "@/components/state/inline-alert";
import { LoadingSpinner } from "@/components/state/loading-spinner";
import { routes } from "@/constants/routes";
import { Link, useRouter } from "@/i18n/navigation";
import { useAuthStore } from "@/lib/auth-store";
import { applyServerValidationErrors, getFormErrorMessage } from "@/lib/form-errors";
import { createLoginFormSchema, type LoginFormValues } from "@/modules/auth/forms";
import { useLoginMutation, useLoginWithGoogleMutation } from "@/modules/auth/hooks";
import { getPostLoginTarget } from "@/modules/auth/route-guards";
import { sanitizeReturnTo } from "@/modules/auth/return-to";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Google Sign-In button
// ---------------------------------------------------------------------------

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
          }) => void;
          renderButton: (parent: HTMLElement, options: {
            theme?: "outline" | "filled_blue" | "filled_black";
            size?: "large" | "medium" | "small";
            width?: number;
            text?: "signin_with" | "signup_with" | "continue_with" | "signin";
          }) => void;
          prompt: () => void;
        };
      };
    };
  }
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58Z"
      />
    </svg>
  );
}

function GoogleSignInButton({
  onCredential,
  loading,
}: {
  onCredential: (idToken: string) => void;
  loading: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";
  const [sdkReady, setSdkReady] = useState(false);

  useEffect(() => {
    if (!clientId) return;

    function initGoogle() {
      if (!window.google || !containerRef.current) return;
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response) => onCredential(response.credential),
        auto_select: false,
      });
      window.google.accounts.id.renderButton(containerRef.current, {
        theme: "outline",
        size: "large",
        width: 500,
        text: "continue_with",
      });
      setSdkReady(true);
    }

    if (window.google) {
      initGoogle();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = initGoogle;
    document.head.appendChild(script);
  }, [clientId, onCredential]);

  if (!clientId) return null;

  return (
    <div
      className={cn(
        "relative h-11 w-full rounded-xl",
        (loading || !sdkReady) && "pointer-events-none opacity-60",
      )}
    >
      {/* Styled layer — visual only, clicks pass through */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center gap-2.5 rounded-xl border border-border bg-card text-sm font-semibold text-foreground transition duration-200 hover:bg-muted/70">
        {loading ? <LoadingSpinner className="h-3.5 w-3.5" /> : <GoogleIcon />}
        <span>Continue with Google</span>
      </div>

      {/* Google's rendered button — transparent overlay, receives clicks */}
      <div
        ref={containerRef}
        className="absolute inset-0 overflow-hidden opacity-0 [&>div]:!h-full [&>div]:!w-full [&_iframe]:!h-full [&_iframe]:!w-full"
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function LoginPage() {
  const t = useTranslations("auth.login");
  const tValidation = useTranslations("auth");
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = sanitizeReturnTo(searchParams.get("return_to"));
  const sessionNotice = useAuthStore((state) => state.sessionNotice);
  const clearSessionNotice = useAuthStore((state) => state.clearSessionNotice);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors }
  } = useForm<LoginFormValues>({
    resolver: zodResolver(createLoginFormSchema(tValidation)),
    defaultValues: { email: "", password: "" }
  });

  useEffect(() => {
    return () => { clearSessionNotice(); };
  }, [clearSessionNotice]);

  const mutation = useLoginMutation();
  const googleMutation = useLoginWithGoogleMutation();

  // Redirect after successful login (email or Google)
  const loginData = mutation.data ?? googleMutation.data;
  useEffect(() => {
    if (!loginData) return;
    const redirectTo = getPostLoginTarget(
      {
        token: loginData.token,
        userType: loginData.userType,
        selectedOrgId: null,
      },
      { returnTo }
    );
    if (redirectTo) router.push(redirectTo);
  }, [loginData, returnTo, router]);

  const isLoading = mutation.isPending || googleMutation.isPending;

  return (
    <AuthShell title={t("title")} subtitle={t("subtitle")}>
      <form
        className="space-y-4"
        onSubmit={handleSubmit((values) => {
          setFormError(null);
          mutation.mutate(values, {
            onError: (error) => {
              const applied = applyServerValidationErrors(setError, error, {
                email: "email",
                password: "password",
              });
              if (!applied) {
                setFormError(getFormErrorMessage(error, t("invalidCredentials")));
              }
            },
          });
        })}
      >
        <AuthInput
          id="email"
          type="email"
          label={t("emailLabel")}
          placeholder={t("emailPlaceholder")}
          error={errors.email?.message}
          {...register("email")}
        />
        <AuthInput
          id="password"
          type="password"
          label={t("passwordLabel")}
          placeholder={t("passwordPlaceholder")}
          error={errors.password?.message}
          {...register("password")}
        />

        <div className="flex items-center justify-between text-sm">
          <label className="inline-flex items-center gap-2 text-muted-foreground">
            <input type="checkbox" className="rounded border-input" />
            {t("rememberMe")}
          </label>
          <Link
            href={routes.forgotPassword}
            className="font-medium text-foreground transition hover:opacity-90"
          >
            {t("forgotPassword")}
          </Link>
        </div>

        {sessionNotice === "expired" && (
          <InlineAlert tone="error">{t("sessionExpired")}</InlineAlert>
        )}
        {formError && <InlineAlert tone="error">{formError}</InlineAlert>}
        {googleMutation.isError && (
          <InlineAlert tone="error">
            {getFormErrorMessage(googleMutation.error, t("invalidCredentials"))}
          </InlineAlert>
        )}

        <AuthButton
          type="submit"
          loading={mutation.isPending}
          loadingLabel={t("submitting")}
          disabled={isLoading}
        >
          {t("submit")}
        </AuthButton>
      </form>

      {/* Divider */}
      <div className="relative my-2 flex items-center gap-3">
        <div className="h-px flex-1 bg-border/60" />
        <span className="text-xs text-muted-foreground">or</span>
        <div className="h-px flex-1 bg-border/60" />
      </div>

      {/* Google Sign-In — rendered by GIS SDK */}
      <GoogleSignInButton
        loading={googleMutation.isPending}
        onCredential={(idToken) => {
          setFormError(null);
          googleMutation.mutate(idToken);
        }}
      />

      <p className="text-center text-sm text-muted-foreground">
        {t("noAccount")}{" "}
        <Link
          href={routes.signup}
          className="font-medium text-foreground transition hover:opacity-90"
        >
          {t("createAccount")}
        </Link>
      </p>
    </AuthShell>
  );
}
