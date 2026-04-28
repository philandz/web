"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { AuthButton } from "@/components/auth/auth-button";
import { AuthInput } from "@/components/auth/auth-input";
import { AuthShell } from "@/components/auth/auth-shell";
import { InlineAlert } from "@/components/state/inline-alert";
import { routes } from "@/constants/routes";
import { Link, useRouter } from "@/i18n/navigation";
import { useAuthStore } from "@/lib/auth-store";
import { applyServerValidationErrors, getFormErrorMessage } from "@/lib/form-errors";
import { createLoginFormSchema, type LoginFormValues } from "@/modules/auth/forms";
import { useLoginMutation, useLoginWithGoogleMutation } from "@/modules/auth/hooks";
import { getPostLoginTarget } from "@/modules/auth/route-guards";
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
          renderButton: (
            element: HTMLElement,
            options: {
              theme?: string;
              size?: string;
              width?: number;
              text?: string;
              shape?: string;
            }
          ) => void;
          prompt: () => void;
        };
      };
    };
  }
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
        width: containerRef.current.offsetWidth || 400,
        text: "continue_with",
        shape: "rectangular",
      });
      setSdkReady(true);
    }

    // If SDK already loaded
    if (window.google) {
      initGoogle();
      return;
    }

    // Load SDK script
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = initGoogle;
    document.head.appendChild(script);

    return () => {
      // cleanup: remove script if component unmounts before load
    };
  }, [clientId, onCredential]);

  if (!clientId) return null;

  return (
    <div
      className={cn(
        "w-full overflow-hidden rounded-xl transition-opacity",
        loading && "pointer-events-none opacity-50",
      )}
    >
      <div ref={containerRef} className="w-full" />
      {!sdkReady && (
        <div className="flex h-10 w-full items-center justify-center rounded-xl border border-border bg-card text-sm text-muted-foreground">
          Loading Google…
        </div>
      )}
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
    const redirectTo = getPostLoginTarget({
      token: loginData.token,
      userType: loginData.userType,
      selectedOrgId: null,
    });
    if (redirectTo) router.push(redirectTo);
  }, [loginData, router]);

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
