"use client";

import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { AuthButton } from "@/components/auth/auth-button";
import { AuthInput } from "@/components/auth/auth-input";
import { AuthShell } from "@/components/auth/auth-shell";
import { InlineAlert } from "@/components/state/inline-alert";
import { routes } from "@/constants/routes";
import { Link } from "@/i18n/navigation";
import { applyServerValidationErrors, getFormErrorMessage } from "@/lib/form-errors";
import { createResetPasswordFormSchema, type ResetPasswordFormValues } from "@/modules/auth/forms";
import { useResetPasswordMutation } from "@/modules/auth/hooks";

export default function ResetPasswordPage() {
  const t = useTranslations("auth.resetPassword");
  const tValidation = useTranslations("auth");
  const searchParams = useSearchParams();
  const [done, setDone] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const token = useMemo(() => searchParams.get("token") ?? "", [searchParams]);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors }
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(createResetPasswordFormSchema(tValidation)),
    defaultValues: {
      newPassword: "",
      confirmPassword: ""
    }
  });

  const mutation = useResetPasswordMutation();

  useEffect(() => {
    if (mutation.isSuccess) {
      setDone(true);
    }
  }, [mutation.isSuccess]);

  return (
    <AuthShell title={t("title")} subtitle={t("subtitle")}>
      {!token ? (
        <div className="space-y-4">
          <InlineAlert tone="error">{t("missingToken")}</InlineAlert>
          <Link
            href={routes.forgotPassword}
            className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-border bg-card text-sm font-semibold text-foreground transition hover:bg-muted/70"
          >
            {t("requestNewLink")}
          </Link>
        </div>
      ) : done ? (
        <div className="space-y-4">
          <InlineAlert tone="success">{t("success")}</InlineAlert>
          <Link
            href={routes.login}
            className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-border bg-card text-sm font-semibold text-foreground transition hover:bg-muted/70"
          >
            {t("backToSignIn")}
          </Link>
        </div>
      ) : (
        <form
          className="space-y-4"
          onSubmit={handleSubmit((values) => {
            setFormError(null);
            mutation.mutate(
              {
                token,
                newPassword: values.newPassword
              },
              {
                onError: (error) => {
                  const applied = applyServerValidationErrors(setError, error, {
                    new_password: "newPassword",
                    newPassword: "newPassword"
                  });
                  if (!applied) {
                    setFormError(getFormErrorMessage(error, t("error")));
                  }
                }
              }
            );
          })}
        >
          <AuthInput
            id="newPassword"
            type="password"
            label={t("newPasswordLabel")}
            placeholder={t("newPasswordPlaceholder")}
            error={errors.newPassword?.message}
            {...register("newPassword")}
          />
          <AuthInput
            id="confirmPassword"
            type="password"
            label={t("confirmPasswordLabel")}
            placeholder={t("confirmPasswordPlaceholder")}
            error={errors.confirmPassword?.message}
            {...register("confirmPassword")}
          />

          {formError ? <InlineAlert tone="error">{formError}</InlineAlert> : null}

          <AuthButton type="submit" loading={mutation.isPending} loadingLabel={t("submitting")}>
            {t("submit")}
          </AuthButton>
        </form>
      )}
    </AuthShell>
  );
}
