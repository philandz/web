"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
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
import { useLoginMutation } from "@/modules/auth/hooks";
import { getPostLoginTarget } from "@/modules/auth/route-guards";

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
    defaultValues: {
      email: "",
      password: ""
    }
  });

  useEffect(() => {
    return () => {
      clearSessionNotice();
    };
  }, [clearSessionNotice]);

  const mutation = useLoginMutation();

  useEffect(() => {
    if (!mutation.data) return;

    const redirectTo = getPostLoginTarget({
      token: mutation.data.token,
      userType: mutation.data.userType,
      selectedOrgId: null
    });

    if (redirectTo) {
      router.push(redirectTo);
    }
  }, [mutation.data, router]);

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
                password: "password"
              });

              if (!applied) {
                setFormError(getFormErrorMessage(error, t("invalidCredentials")));
              }
            }
          });
        })}
      >
        <AuthInput id="email" type="email" label={t("emailLabel")} placeholder={t("emailPlaceholder")} error={errors.email?.message} {...register("email")} />
        <AuthInput id="password" type="password" label={t("passwordLabel")} placeholder={t("passwordPlaceholder")} error={errors.password?.message} {...register("password")} />

        <div className="flex items-center justify-between text-sm">
          <label className="inline-flex items-center gap-2 text-muted-foreground">
            <input type="checkbox" className="rounded border-input" />
            {t("rememberMe")}
          </label>
          <Link href={routes.forgotPassword} className="font-medium text-foreground transition hover:opacity-90">
            {t("forgotPassword")}
          </Link>
        </div>

        {sessionNotice === "expired" ? (
          <InlineAlert tone="error">
            {t("sessionExpired")}
          </InlineAlert>
        ) : null}

        {formError ? <InlineAlert tone="error">{formError}</InlineAlert> : null}

        <AuthButton type="submit" loading={mutation.isPending} loadingLabel={t("submitting")}>
          {t("submit")}
        </AuthButton>

        <AuthButton type="button" variant="ghost">
          {t("google")}
        </AuthButton>

        <p className="text-center text-sm text-muted-foreground">
          {t("noAccount")}{" "}
          <Link href={routes.signup} className="font-medium text-foreground transition hover:opacity-90">
            {t("createAccount")}
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
