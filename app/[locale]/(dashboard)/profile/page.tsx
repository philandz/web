"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Camera, Loader2 } from "lucide-react";

import { FormInput } from "@/components/form/form-input";
import { FormTextarea } from "@/components/form/form-textarea";
import { InlineAlert } from "@/components/state/inline-alert";
import { LoadingButton } from "@/components/state/loading-button";
import { useToast } from "@/components/state/toast-provider";
import { UserAvatar } from "@/components/ui/user-avatar";
import { routes } from "@/constants/routes";
import { useRouter } from "@/i18n/navigation";
import { useAuthStore } from "@/lib/auth-store";
import { applyServerValidationErrors } from "@/lib/form-errors";
import { cn } from "@/lib/utils";
import { AVATAR_FILE_TYPES, createProfileFormSchema, type ProfileFormValues } from "@/modules/auth/forms";
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

  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    setValue,
    watch,
    formState: { errors, isDirty }
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(createProfileFormSchema(t)),
    defaultValues: {
      displayName: profile?.displayName ?? "",
      avatarFile: null,
      bio: profile?.bio ?? "",
      timezone: profile?.timezone ?? "",
      locale: profile?.locale ?? ""
    }
  });

  const avatarRegister = register("avatarFile");
  const avatarFile = watch("avatarFile");
  const avatarSrc = useMemo(
    () => avatarPreviewUrl ?? profile?.avatar ?? "",
    [avatarPreviewUrl, profile?.avatar]
  );

  useProfileQuery(handleUnauthorized);

  useEffect(() => {
    if (!(avatarFile instanceof File)) {
      setAvatarPreviewUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(avatarFile);
    setAvatarPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [avatarFile]);

  useEffect(() => {
    if (profile) {
      reset({
        displayName: profile.displayName ?? "",
        avatarFile: null,
        bio: profile.bio ?? "",
        timezone: profile.timezone ?? "",
        locale: profile.locale ?? ""
      });
      if (avatarInputRef.current) avatarInputRef.current.value = "";
    }
  }, [profile, reset]);

  const mutation = useUpdateProfileMutation(handleUnauthorized);

  function handleFileSelect(file: File | null) {
    if (!file) return;
    setValue("avatarFile", file, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0] ?? null;
    if (file && AVATAR_FILE_TYPES.includes(file.type as (typeof AVATAR_FILE_TYPES)[number])) {
      handleFileSelect(file);
    }
  }

  const isUploading = mutation.isPending && avatarFile instanceof File;

  return (
    <div className="mx-auto max-w-2xl animate-fade-in-up space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <form
        onSubmit={handleSubmit((values) =>
          mutation.mutate(
            { values, avatarFile: values.avatarFile instanceof File ? values.avatarFile : null },
            {
              onSuccess: () => {
                setValue("avatarFile", null, { shouldDirty: false, shouldValidate: false });
                if (avatarInputRef.current) avatarInputRef.current.value = "";
                toast.success(t("success"));
              },
              onError: (error) => {
                applyServerValidationErrors(setError, error, {
                  display_name: "displayName",
                  displayName: "displayName",
                  avatar: "avatarFile",
                  bio: "bio",
                  timezone: "timezone",
                  locale: "locale"
                });
                toast.error(tCommon("states.somethingWrong"));
              }
            }
          )
        )}
        className="space-y-4"
      >
        {/* Avatar + identity card */}
        <section className="surface-panel rounded-2xl p-6">
          <h2 className="mb-5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {t("sectionIdentity")}
          </h2>

          {/* Avatar upload zone */}
          <div className="mb-6 flex flex-col items-center gap-4 sm:flex-row sm:items-start">
            {/* Avatar preview */}
            <div className="relative shrink-0">
              <div
                className={cn(
                  "relative h-20 w-20 cursor-pointer overflow-hidden rounded-2xl ring-2 ring-border transition-all duration-200",
                  isDragging && "ring-primary ring-offset-2 ring-offset-background",
                  "hover:ring-primary/60"
                )}
                onClick={() => avatarInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                role="button"
                tabIndex={0}
                aria-label={t("avatarUploadLabel")}
                onKeyDown={(e) => e.key === "Enter" && avatarInputRef.current?.click()}
              >
                <UserAvatar
                  name={profile?.displayName ?? profile?.email ?? "User"}
                  src={avatarSrc}
                  size={80}
                  className="rounded-2xl"
                />
                {/* Overlay */}
                <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/40 opacity-0 transition-opacity duration-200 hover:opacity-100">
                  {isUploading ? (
                    <Loader2 className="h-5 w-5 animate-spin text-white" />
                  ) : (
                    <Camera className="h-5 w-5 text-white" />
                  )}
                </div>
              </div>
              {/* Hidden file input */}
              <input
                {...avatarRegister}
                ref={(el) => { avatarRegister.ref(el); avatarInputRef.current = el; }}
                type="file"
                accept={AVATAR_FILE_TYPES.join(",")}
                className="sr-only"
                onChange={(e) => handleFileSelect(e.target.files?.[0] ?? null)}
              />
            </div>

            {/* Upload instructions */}
            <div className="flex-1 text-center sm:text-left">
              <p className="text-sm font-medium text-foreground">
                {avatarFile instanceof File ? avatarFile.name : t("avatarTitle")}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">{t("avatarHint")}</p>
              {errors.avatarFile?.message ? (
                <p className="mt-1.5 text-xs text-destructive" role="alert">
                  {errors.avatarFile.message}
                </p>
              ) : null}
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                className="mt-3 inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground transition hover:bg-muted"
              >
                <Camera className="h-3.5 w-3.5" />
                {t("avatarChange")}
              </button>
            </div>
          </div>

          {/* Identity fields */}
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Email — read-only, clearly marked */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                {t("email")}
              </label>
              <div className="flex h-11 items-center gap-2.5 rounded-xl border border-border bg-muted/60 px-3.5">
                <span className="truncate text-sm text-muted-foreground">{profile?.email ?? ""}</span>
                <span className="ml-auto shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  {t("emailReadOnly")}
                </span>
              </div>
            </div>

            <FormInput
              label={t("displayName")}
              error={errors.displayName?.message}
              {...register("displayName")}
            />
          </div>
        </section>

        {/* About section */}
        <section className="surface-panel rounded-2xl p-6">
          <h2 className="mb-5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {t("sectionAbout")}
          </h2>
          <FormTextarea
            label={t("bio")}
            rows={3}
            error={errors.bio?.message}
            {...register("bio")}
          />
        </section>

        {/* Preferences section */}
        <section className="surface-panel rounded-2xl p-6">
          <h2 className="mb-5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {t("sectionPreferences")}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormInput
              label={t("timezone")}
              placeholder={t("timezonePlaceholder")}
              error={errors.timezone?.message}
              {...register("timezone")}
            />
            <FormInput
              label={t("locale")}
              placeholder={t("localePlaceholder")}
              error={errors.locale?.message}
              {...register("locale")}
            />
          </div>
        </section>

        {/* Error state */}
        {mutation.isError ? (
          <InlineAlert tone="error">{t("error")}</InlineAlert>
        ) : null}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pb-2">
          {isDirty && !mutation.isPending ? (
            <button
              type="button"
              onClick={() => {
                reset();
                setAvatarPreviewUrl(null);
                if (avatarInputRef.current) avatarInputRef.current.value = "";
              }}
              className="h-10 rounded-xl border border-border bg-card px-4 text-sm font-medium text-foreground transition hover:bg-muted"
            >
              {tCommon("actions.cancel")}
            </button>
          ) : null}
          <LoadingButton
            type="submit"
            loading={mutation.isPending}
            loadingLabel={t("saving")}
            className="h-10 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {t("save")}
          </LoadingButton>
        </div>
      </form>
    </div>
  );
}
