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
import { Link } from "@/i18n/navigation";
import { applyServerValidationErrors, getFormErrorMessage } from "@/lib/form-errors";
import { createForgotPasswordFormSchema, type ForgotPasswordFormValues } from "@/modules/auth/forms";
import { useForgotPasswordMutation } from "@/modules/auth/hooks";

export default function ForgotPasswordPage() {
  const t = useTranslations("auth.forgotPassword");
  const tValidation = useTranslations("auth");
  const [sent, setSent] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors }
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(createForgotPasswordFormSchema(tValidation)),
    defaultValues: {
      email: ""
    }
  });

  const mutation = useForgotPasswordMutation();

  useEffect(() => {
    if (mutation.isSuccess) {
      setSent(true);
    }
  }, [mutation.isSuccess]);

  return (
    <AuthShell title={t("title")} subtitle={t("subtitle")}>
      {sent ? (
        <div className="space-y-4">
          <InlineAlert tone="success">
            {t("success")}
          </InlineAlert>
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
            mutation.mutate(values, {
              onError: (error) => {
                const applied = applyServerValidationErrors(setError, error, { email: "email" });
                if (!applied) {
                  setFormError(getFormErrorMessage(error, t("error")));
                }
              }
            });
          })}
        >
          <AuthInput id="email" type="email" label={t("emailLabel")} placeholder={t("emailPlaceholder")} error={errors.email?.message} {...register("email")} />

          {formError ? <InlineAlert tone="error">{formError}</InlineAlert> : null}

          <AuthButton type="submit" loading={mutation.isPending} loadingLabel={t("submitting")}>
            {t("submit")}
          </AuthButton>

          <p className="text-center text-sm text-muted-foreground">
            {t("remembered")}{" "}
            <Link href={routes.login} className="font-medium text-foreground transition hover:opacity-90">
              {t("signIn")}
            </Link>
          </p>
        </form>
      )}
    </AuthShell>
  );
}
