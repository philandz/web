"use client";

import { useCallback, useEffect } from "react";
import { useTranslations } from "next-intl";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { FormInput } from "@/components/form/form-input";
import { FormTextarea } from "@/components/form/form-textarea";
import { InlineAlert } from "@/components/state/inline-alert";
import { LoadingButton } from "@/components/state/loading-button";
import { useToast } from "@/components/state/toast-provider";
import { routes } from "@/constants/routes";
import { useRouter } from "@/i18n/navigation";
import { useAuthStore } from "@/lib/auth-store";
import { applyServerValidationErrors } from "@/lib/form-errors";
import { createProfileFormSchema, type ProfileFormValues } from "@/modules/auth/forms";
import { useProfileQuery, useUpdateProfileMutation } from "@/modules/auth/hooks";

export default function ProfilePage() {
  const t = useTranslations("dashboard.profile");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const toast = useToast();
  const profile = useAuthStore((state) => state.profile);
  const clearAuth = useAuthStore((state) => state.clearAuth);

  const handleUnauthorized = useCallback(() => {
    clearAuth();
    router.replace(routes.login);
  }, [clearAuth, router]);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors }
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(createProfileFormSchema(t)),
    defaultValues: {
      displayName: profile?.displayName ?? "",
      avatar: profile?.avatar ?? "",
      bio: profile?.bio ?? "",
      timezone: profile?.timezone ?? "",
      locale: profile?.locale ?? ""
    }
  });

  useProfileQuery(handleUnauthorized);

  useEffect(() => {
    if (profile) {
      reset({
        displayName: profile.displayName ?? "",
        avatar: profile.avatar ?? "",
        bio: profile.bio ?? "",
        timezone: profile.timezone ?? "",
        locale: profile.locale ?? ""
      });
    }
  }, [profile, reset]);

  const mutation = useUpdateProfileMutation(handleUnauthorized);

  return (
    <section className="surface-panel rounded-2xl p-4 md:p-6">
      <div className="mb-6">
        <h1 className="text-[26px] font-semibold tracking-tight text-foreground">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <form
        className="grid gap-4 md:grid-cols-2"
        onSubmit={handleSubmit((values) =>
          mutation.mutate(values, {
            onSuccess: () => {
              toast.success(t("success"));
            },
            onError: (error) => {
              applyServerValidationErrors(setError, error, {
                display_name: "displayName",
                displayName: "displayName",
                avatar: "avatar",
                bio: "bio",
                timezone: "timezone",
                locale: "locale"
              });
              toast.error(tCommon("states.somethingWrong"));
            }
          })
        )}
      >
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">{t("email")}</label>
          <input
            disabled
            value={profile?.email ?? ""}
            className="h-11 w-full rounded-xl border border-input bg-muted px-3.5 text-sm text-muted-foreground"
          />
        </div>

        <FormInput label={t("displayName")} error={errors.displayName?.message} {...register("displayName")} />

        <FormInput className="md:col-span-2" label={t("avatar")} placeholder={t("avatarPlaceholder")} error={errors.avatar?.message} {...register("avatar")} />

        <FormTextarea className="md:col-span-2" label={t("bio")} rows={3} error={errors.bio?.message} {...register("bio")} />

        <FormInput label={t("timezone")} placeholder={t("timezonePlaceholder")} error={errors.timezone?.message} {...register("timezone")} />

        <FormInput label={t("locale")} placeholder={t("localePlaceholder")} error={errors.locale?.message} {...register("locale")} />

        {mutation.isError ? (
          <InlineAlert tone="error" className="md:col-span-2">
            {t("error")}
          </InlineAlert>
        ) : null}

        {mutation.isSuccess ? (
          <InlineAlert tone="success" className="md:col-span-2">
            {t("success")}
          </InlineAlert>
        ) : null}

        <div className="md:col-span-2 flex justify-end">
          <LoadingButton
            type="submit"
            loading={mutation.isPending}
            loadingLabel={t("saving")}
            className="h-11 rounded-xl bg-highlight px-5 text-sm font-semibold text-foreground transition hover:bg-highlight/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {t("save")}
          </LoadingButton>
        </div>
      </form>
    </section>
  );
}
