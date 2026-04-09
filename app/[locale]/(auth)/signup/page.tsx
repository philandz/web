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
import { applyServerValidationErrors, getFormErrorMessage } from "@/lib/form-errors";
import { createSignupFormSchema, type SignupFormValues } from "@/modules/auth/forms";
import { useSignupMutation } from "@/modules/auth/hooks";

export default function SignupPage() {
  const t = useTranslations("auth.signup");
  const tValidation = useTranslations("auth");
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors }
  } = useForm<SignupFormValues>({
    resolver: zodResolver(createSignupFormSchema(tValidation)),
    defaultValues: {
      displayName: "",
      email: "",
      password: "",
      confirmPassword: ""
    }
  });

  const mutation = useSignupMutation();

  useEffect(() => {
    if (mutation.isSuccess) {
      router.push(routes.login);
    }
  }, [mutation.isSuccess, router]);

  return (
    <AuthShell title={t("title")} subtitle={t("subtitle")}>
      <form
        className="space-y-4"
        onSubmit={handleSubmit((values) => {
          setFormError(null);
          mutation.mutate(
            {
              displayName: values.displayName,
              email: values.email,
              password: values.password
            },
            {
              onError: (error) => {
                const applied = applyServerValidationErrors(setError, error, {
                  display_name: "displayName",
                  displayName: "displayName",
                  email: "email",
                  password: "password"
                });

                if (!applied) {
                  setFormError(getFormErrorMessage(error, t("error")));
                }
              }
            }
          );
        })}
      >
        <AuthInput id="displayName" label={t("displayNameLabel")} placeholder={t("displayNamePlaceholder")} error={errors.displayName?.message} {...register("displayName")} />
        <AuthInput id="email" type="email" label={t("emailLabel")} placeholder={t("emailPlaceholder")} error={errors.email?.message} {...register("email")} />
        <AuthInput id="password" type="password" label={t("passwordLabel")} placeholder={t("passwordPlaceholder")} error={errors.password?.message} {...register("password")} />
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

        <p className="text-center text-sm text-muted-foreground">
          {t("hasAccount")}{" "}
          <Link href={routes.login} className="font-medium text-foreground transition hover:opacity-90">
            {t("signIn")}
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
