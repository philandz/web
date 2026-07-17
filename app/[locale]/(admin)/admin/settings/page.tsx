"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle2, Eye, EyeOff, Mail, RefreshCw, Server, ShieldCheck } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { StaggerItem } from "@/components/motion/stagger-item";
import { FormInput } from "@/components/form/form-input";
import { InlineAlert } from "@/components/state/inline-alert";
import { LoadingButton } from "@/components/state/loading-button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useToast } from "@/components/state/toast-provider";
import {
  useResendConfigQuery,
  useSystemConfigQuery,
  useTestResendConfigMutation,
  useUpdateResendConfigMutation,
  useUpdateSystemConfigMutation
} from "@/modules/admin/hooks";
import { cn } from "@/lib/utils";
import { applyServerValidationErrors, getFormErrorMessage } from "@/lib/form-errors";

const createSchema = (t: (k: string) => string) =>
  z.object({
    apiKey: z
      .string()
      .min(20, t("validation.apiKeyMin"))
      .regex(/^[A-Za-z0-9_-]+$/, t("validation.apiKeyCharset")),
    fromAddress: z.string().email(t("validation.fromAddress")),
    replyTo: z
      .string()
      .email(t("validation.replyTo"))
      .optional()
      .or(z.literal(""))
  });

type FormValues = z.infer<ReturnType<typeof createSchema>>;

const createTestSchema = (t: (k: string) => string) =>
  z.object({ recipientEmail: z.string().email(t("validation.recipientEmail")) });

type TestFormValues = z.infer<ReturnType<typeof createTestSchema>>;

export default function AdminSettingsPage() {
  const t = useTranslations("admin.settings");
  const tValidation = useTranslations("admin.settings.resend");
  const toast = useToast();

  const query = useResendConfigQuery();
  const update = useUpdateResendConfigMutation();
  const test = useTestResendConfigMutation();

  const [editing, setEditing] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [savedKeySnapshot, setSavedKeySnapshot] = useState<string>("");
  const [formError, setFormError] = useState<string | null>(null);
  const [testError, setTestError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isDirty }
  } = useForm<FormValues>({
    resolver: zodResolver(createSchema(tValidation)),
    defaultValues: { apiKey: "", fromAddress: "", replyTo: "" }
  });

  const {
    register: registerTest,
    handleSubmit: handleSubmitTest,
    setError: setTestFieldError,
    reset: resetTest,
    formState: { errors: testErrors }
  } = useForm<TestFormValues>({
    resolver: zodResolver(createTestSchema(tValidation)),
    defaultValues: { recipientEmail: "" }
  });

  // Seed the form once we have the saved values.
  useEffect(() => {
    if (query.data && !editing && !isDirty) {
      const v = {
        apiKey: query.data.maskedKey || "",
        fromAddress: query.data.fromAddress,
        replyTo: query.data.replyTo
      };
      reset(v);
      setSavedKeySnapshot(v.apiKey);
    }
  }, [query.data, editing, isDirty, reset]);

  function onSubmit(values: FormValues) {
    setFormError(null);
    update.mutate(
      {
        apiKey: values.apiKey,
        fromAddress: values.fromAddress,
        replyTo: values.replyTo || undefined
      },
      {
        onSuccess: (cfg) => {
          setEditing(false);
          setSavedKeySnapshot(cfg.maskedKey);
          reset({ apiKey: cfg.maskedKey, fromAddress: cfg.fromAddress, replyTo: cfg.replyTo });
          toast.success(t("resend.saveSuccess"));
        },
        onError: (error) => {
          const applied = applyServerValidationErrors(setError, error, {
            api_key: "apiKey",
            from_address: "fromAddress",
            reply_to: "replyTo"
          });
          if (!applied) {
            setFormError(getFormErrorMessage(error, t("resend.saveError")));
          }
        }
      }
    );
  }

  function onTestSubmit(values: TestFormValues) {
    setTestError(null);
    test.mutate(
      { recipientEmail: values.recipientEmail },
      {
        onSuccess: (res) => {
          toast.success(t("resend.testSuccess", { messageId: res.messageId }));
          resetTest({ recipientEmail: "" });
        },
        onError: (error) => {
          const applied = applyServerValidationErrors(setTestFieldError, error, {
            recipient_email: "recipientEmail"
          });
          if (!applied) {
            setTestError(getFormErrorMessage(error, t("resend.testError")));
          }
        }
      }
    );
  }

  const isLoading = query.isLoading;
  const sourceLabel = query.data
    ? t(`resend.source.${query.data.source}`, { defaultValue: query.data.source })
    : "-";

  return (
    <div className="space-y-6">
      <StaggerItem delay={0}>
        <PageHeader
          title={t("title")}
          description={t("subtitle")}
          eyebrow={t("badge")}
          icon={<ShieldCheck className="h-5 w-5" />}
        />
      </StaggerItem>

      <StaggerItem delay={40}>
        <Card className="surface-panel">
          <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
            <div>
              <h2 className="text-base font-semibold text-foreground">{t("resend.title")}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{t("resend.subtitle")}</p>
            </div>
            {!editing ? (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground transition hover:bg-muted"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                {t("edit")}
              </button>
            ) : null}
          </CardHeader>
          <CardContent className="space-y-6">
            {isLoading || !query.data ? (
              <p className="text-sm text-muted-foreground">{t("loading")}</p>
            ) : editing ? (
              <form
                onSubmit={handleSubmit(onSubmit)}
                className="space-y-4"
                data-testid="resend-edit-form"
              >
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                    {t("resend.apiKeyLabel")}
                  </label>
                  <div className="relative">
                    <input
                      id="api-key"
                      type={showKey ? "text" : "password"}
                      autoComplete="off"
                      placeholder={t("resend.apiKeyPlaceholder")}
                      className="h-11 w-full rounded-xl border border-input bg-background px-3.5 pr-10 font-mono text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/50"
                      {...register("apiKey")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition hover:text-foreground"
                      aria-label={showKey ? t("resend.hideKey") : t("resend.showKey")}
                    >
                      {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">{t("resend.apiKeyHint")}</p>
                  {errors.apiKey?.message ? (
                    <p className="text-xs text-destructive" role="alert">
                      {errors.apiKey.message}
                    </p>
                  ) : null}
                </div>

                <FormInput
                  id="from-address"
                  type="email"
                  label={t("resend.fromAddressLabel")}
                  placeholder={t("resend.fromAddressPlaceholder")}
                  hint={t("resend.fromAddressHint")}
                  error={errors.fromAddress?.message}
                  {...register("fromAddress")}
                />

                <FormInput
                  id="reply-to"
                  type="email"
                  label={t("resend.replyToLabel")}
                  placeholder={t("resend.replyToPlaceholder")}
                  error={errors.replyTo?.message}
                  {...register("replyTo")}
                />

                {formError ? <InlineAlert tone="error">{formError}</InlineAlert> : null}

                <div className="flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      reset();
                      setEditing(false);
                      setFormError(null);
                    }}
                    className="h-10 rounded-xl border border-border bg-card px-4 text-sm font-medium text-foreground transition hover:bg-muted"
                  >
                    {tValidation("cancel")}
                  </button>
                  <LoadingButton
                    type="submit"
                    loading={update.isPending}
                    loadingLabel={t("resend.saving")}
                    className="h-10 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {t("resend.save")}
                  </LoadingButton>
                </div>
              </form>
            ) : (
              <dl className="grid gap-3 text-sm">
                <Row label={t("resend.apiKeyLabel")} value={query.data.maskedKey || "-"} mono />
                <Row label={t("resend.fromAddressLabel")} value={query.data.fromAddress || "-"} />
                <Row label={t("resend.replyToLabel")} value={query.data.replyTo || "-"} />
                <Row label={t("resend.sourceLabel")} value={sourceLabel} badge={true} />
                <Row
                  label={t("resend.configuredLabel")}
                  value={
                    query.data.configured ? (
                      <span className="inline-flex items-center gap-1.5 text-primary">
                        <CheckCircle2 className="h-3.5 w-3.5" /> {t("yes")}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">{t("no")}</span>
                    )
                  }
                />
                {!query.data.configured ? (
                  <InlineAlert tone="info">{t("resend.notConfiguredHint")}</InlineAlert>
                ) : null}
              </dl>
            )}
          </CardContent>
        </Card>
      </StaggerItem>

      <StaggerItem delay={80}>
        <Card className="surface-panel">
          <CardHeader>
            <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
              <Mail className="h-4 w-4" />
              {t("resend.testTitle")}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("resend.testSubtitle")}</p>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={handleSubmitTest(onTestSubmit)}
              className="space-y-4"
              data-testid="resend-test-form"
            >
              <FormInput
                id="test-recipient"
                type="email"
                label={t("resend.testRecipientLabel")}
                placeholder={t("resend.testRecipientPlaceholder")}
                hint={t("resend.testRecipientHint")}
                error={testErrors.recipientEmail?.message}
                {...registerTest("recipientEmail")}
              />
              {testError ? <InlineAlert tone="error">{testError}</InlineAlert> : null}
              <div className="flex items-center justify-end">
                <LoadingButton
                  type="submit"
                  loading={test.isPending}
                  loadingLabel={t("resend.testSending")}
                  disabled={!query.data?.configured}
                  className="h-10 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {t("resend.testSend")}
                </LoadingButton>
              </div>
              {!query.data?.configured ? (
                <p className="text-xs text-muted-foreground">{t("resend.testNeedsConfigured")}</p>
              ) : null}
            </form>
          </CardContent>
        </Card>
      </StaggerItem>

      <StaggerItem delay={120}>
        <SystemConfigCard />
      </StaggerItem>

      <StaggerItem delay={160}>
        <Card className="surface-panel">
          <CardHeader>
            <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
              <Server className="h-4 w-4" />
              {t("diagnostics.title")}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("diagnostics.subtitle")}</p>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p className="flex items-start gap-2">
              <span className="font-mono text-xs">PLATFORM_MASTER_KEY</span>
              <span>{t("diagnostics.masterKey")}</span>
            </p>
            <p className="text-xs italic text-muted-foreground/80">
              {t("diagnostics.masterKeyNote")}
            </p>
          </CardContent>
        </Card>
      </StaggerItem>
    </div>
  );
}

function Row({
  label,
  value,
  mono,
  badge
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
  badge?: boolean;
}) {
  return (
    <div className="grid grid-cols-1 gap-1 border-b border-border pb-3 last:border-b-0 last:pb-0 sm:grid-cols-[180px_1fr]">
      <dt className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">{label}</dt>
      <dd className={cn("break-all text-foreground", mono && "font-mono text-xs")}>
        {badge ? (
          <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-foreground">
            {value}
          </span>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}

// ---------------------------------------------------------------------------
// System environment card — URLs, locale, support email, From address.
// These override env values live (no service restart needed).
// ---------------------------------------------------------------------------

const createSystemConfigSchema = (t: (k: string) => string) =>
  z.object({
    appPublicBaseUrl: z
      .string()
      .min(8, t("validation.urlInvalid"))
      .regex(/^https?:\/\//, t("validation.urlProtocol")),
    supportEmail: z.string().email(t("validation.email")),
    defaultLocale: z
      .string()
      .min(1)
      .max(10)
      .regex(/^[a-z0-9-]+$/, t("validation.localeFormat")),
    mailFromAddress: z.string().email(t("validation.email"))
  });

type SystemFormValues = z.infer<ReturnType<typeof createSystemConfigSchema>>;

function SystemConfigCard() {
  const t = useTranslations("admin.settings.system");
  const tValidation = useTranslations("admin.settings");
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const query = useSystemConfigQuery();
  const update = useUpdateSystemConfigMutation();

  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isDirty }
  } = useForm<SystemFormValues>({
    resolver: zodResolver(createSystemConfigSchema(t)),
    defaultValues: {
      appPublicBaseUrl: "",
      supportEmail: "",
      defaultLocale: "",
      mailFromAddress: ""
    }
  });

  // Seed the form once we have the saved values.
  useEffect(() => {
    if (query.data && !editing && !isDirty) {
      reset({
        appPublicBaseUrl: query.data.appPublicBaseUrl,
        supportEmail: query.data.supportEmail,
        defaultLocale: query.data.defaultLocale,
        mailFromAddress: query.data.mailFromAddress
      });
    }
  }, [query.data, editing, isDirty, reset]);

  function onSubmit(values: SystemFormValues) {
    setFormError(null);
    update.mutate(
      {
        appPublicBaseUrl: values.appPublicBaseUrl,
        supportEmail: values.supportEmail,
        defaultLocale: values.defaultLocale,
        mailFromAddress: values.mailFromAddress
      },
      {
        onSuccess: (cfg) => {
          setEditing(false);
          reset({
            appPublicBaseUrl: cfg.appPublicBaseUrl,
            supportEmail: cfg.supportEmail,
            defaultLocale: cfg.defaultLocale,
            mailFromAddress: cfg.mailFromAddress
          });
          toast.success(t("saveSuccess"));
        },
        onError: (error) => {
          const applied = applyServerValidationErrors(setError, error, {
            app_public_base_url: "appPublicBaseUrl",
            support_email: "supportEmail",
            default_locale: "defaultLocale",
            mail_from_address: "mailFromAddress"
          });
          if (!applied) {
            setFormError(getFormErrorMessage(error, t("saveError")));
          }
        }
      }
    );
  }

  const cfg = query.data;
  const isLoading = query.isLoading;

  return (
    <Card className="surface-panel">
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
            <Server className="h-4 w-4" />
            {t("title")}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        {!editing ? (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground transition hover:bg-muted"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            {tValidation("edit")}
          </button>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading || !cfg ? (
          <p className="text-sm text-muted-foreground">{t("loading")}</p>
        ) : editing ? (
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-4"
            data-testid="system-edit-form"
          >
            <FormInput
              id="app-public-base-url"
              type="url"
              label={t("fields.appPublicBaseUrl")}
              placeholder="https://app.example.com"
              hint={t("hints.appPublicBaseUrl")}
              error={errors.appPublicBaseUrl?.message}
              {...register("appPublicBaseUrl")}
            />
            <FormInput
              id="support-email"
              type="email"
              label={t("fields.supportEmail")}
              placeholder="support@example.com"
              hint={t("hints.supportEmail")}
              error={errors.supportEmail?.message}
              {...register("supportEmail")}
            />
            <FormInput
              id="default-locale"
              label={t("fields.defaultLocale")}
              placeholder="en"
              hint={t("hints.defaultLocale")}
              error={errors.defaultLocale?.message}
              {...register("defaultLocale")}
            />
            <FormInput
              id="mail-from-address"
              type="email"
              label={t("fields.mailFromAddress")}
              placeholder="Philandz <noreply@example.com>"
              hint={t("hints.mailFromAddress")}
              error={errors.mailFromAddress?.message}
              {...register("mailFromAddress")}
            />

            {formError ? <InlineAlert tone="error">{formError}</InlineAlert> : null}

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  reset();
                  setEditing(false);
                  setFormError(null);
                }}
                className="h-10 rounded-xl border border-border bg-card px-4 text-sm font-medium text-foreground transition hover:bg-muted"
              >
                {tValidation("cancel")}
              </button>
              <LoadingButton
                type="submit"
                loading={update.isPending}
                loadingLabel={t("saving")}
                className="h-10 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {t("save")}
              </LoadingButton>
            </div>
          </form>
        ) : (
          <dl className="grid gap-3 text-sm">
            <Row
              label={t("fields.appPublicBaseUrl")}
              value={cfg.appPublicBaseUrl || "-"}
              mono
              badge
            />
            <Row label={t("fields.supportEmail")} value={cfg.supportEmail || "-"} />
            <Row label={t("fields.defaultLocale")} value={cfg.defaultLocale || "-"} />
            <Row label={t("fields.mailFromAddress")} value={cfg.mailFromAddress || "-"} />
            <p className="mt-2 text-xs text-muted-foreground">
              {t("sourceHint", {
                url: t(`source.${cfg.sourceAppPublicBaseUrl}`),
                support: t(`source.${cfg.sourceSupportEmail}`),
                locale: t(`source.${cfg.sourceDefaultLocale}`),
                from: t(`source.${cfg.sourceMailFromAddress}`)
              })}
            </p>
          </dl>
        )}
      </CardContent>
    </Card>
  );
}
