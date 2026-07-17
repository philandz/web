"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, MailCheck, ShieldCheck } from "lucide-react";

import { OtpInput } from "@/components/form/otp-input";
import { FormInput } from "@/components/form/form-input";
import { InlineAlert } from "@/components/state/inline-alert";
import { LoadingButton } from "@/components/state/loading-button";
import { useToast } from "@/components/state/toast-provider";
import { applyServerValidationErrors, getFormErrorMessage } from "@/lib/form-errors";
import { z } from "zod";
import {
  useConfirmPasswordChangeOtpMutation,
  useRequestPasswordChangeOtpMutation
} from "@/modules/auth/hooks";
import { useAuthStore } from "@/lib/auth-store";
import { useRouter } from "@/i18n/navigation";
import { routes } from "@/constants/routes";
import { cn } from "@/lib/utils";

type Translate = (key: string) => string;

const createStep1Schema = (t: Translate) =>
  z
    .object({
      currentPassword: z.string().min(8, t("validation.passwordMin")),
      newPassword: z.string().min(8, t("validation.passwordMin")),
      confirmNewPassword: z.string().min(8, t("validation.passwordMin"))
    })
    .refine((d) => d.newPassword === d.confirmNewPassword, {
      message: t("validation.passwordMismatch"),
      path: ["confirmNewPassword"]
    })
    .refine((d) => d.currentPassword !== d.newPassword, {
      message: t("validation.passwordMustDiffer"),
      path: ["newPassword"]
    });

type Step1Values = z.infer<ReturnType<typeof createStep1Schema>>;

type Props = {
  onUnauthorized: () => void;
};

export function UpdatePasswordCard({ onUnauthorized }: Props) {
  const t = useTranslations("dashboard.profile.password");
  const tValidation = useTranslations("auth");
  const tCommon = useTranslations("common");
  const toast = useToast();
  const router = useRouter();
  const clearAuth = useAuthStore((s) => s.clearAuth);

  type Step = "form" | "verify" | "done";
  const [step, setStep] = useState<Step>("form");
  const [ttlSeconds, setTtlSeconds] = useState(0);
  const [pendingNewPassword, setPendingNewPassword] = useState<string>("");
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otp, setOtp] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
    reset: resetForm
  } = useForm<Step1Values>({
    resolver: zodResolver(createStep1Schema(tValidation)),
    defaultValues: { currentPassword: "", newPassword: "", confirmNewPassword: "" }
  });

  const requestOtp = useRequestPasswordChangeOtpMutation(onUnauthorized);
  const confirmOtp = useConfirmPasswordChangeOtpMutation(onUnauthorized);

  const [formError, setFormError] = useState<string | null>(null);

  // Countdown timer while waiting for the user to paste the code.
  useEffect(() => {
    if (step !== "verify" || ttlSeconds <= 0) return;
    const t = setInterval(() => setTtlSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [step, ttlSeconds]);

  function onStep1Submit(values: Step1Values) {
    setFormError(null);
    requestOtp.mutate(
      { currentPassword: values.currentPassword, newPassword: values.newPassword },
      {
        onSuccess: (res) => {
          setPendingNewPassword(values.newPassword);
          setTtlSeconds(res.ttlSeconds);
          setStep("verify");
        },
        onError: (error) => {
          const applied = applyServerValidationErrors(setError, error, {
            current_password: "currentPassword",
            new_password: "newPassword"
          });
          if (!applied) {
            setFormError(getFormErrorMessage(error, t("errorSend")));
          }
        }
      }
    );
  }

  function resendCode() {
    setOtpError(null);
    setOtp("");
    if (!pendingNewPassword) return;
    // We don't have access to the original currentPassword anymore, so the
    // simplest UX is to send the user back to step 1 to re-enter it. The
    // server TTL means a stale attempt isn't fatal.
    setStep("form");
    resetForm({ currentPassword: "", newPassword: "", confirmNewPassword: "" });
    toast.info(t("resendHint"));
  }

  function onOtpComplete(code: string) {
    setOtpError(null);
    confirmOtp.mutate(
      { otp: code, newPassword: pendingNewPassword },
      {
        onSuccess: () => {
          setStep("done");
          // Force re-auth so all sessions use the new credential.
          clearAuth();
          toast.success(t("success"));
          // Slight delay so users see the success state before redirect.
          setTimeout(() => router.replace(routes.login), 800);
        },
        onError: (error) => {
          const msg = getFormErrorMessage(error, t("errorInvalidCode"));
          setOtpError(msg);
        }
      }
    );
  }

  if (step === "done") {
    return (
      <section className="surface-panel rounded-2xl p-6" data-testid="password-update-success">
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <MailCheck className="h-10 w-10 text-primary" />
          <h3 className="text-base font-semibold text-foreground">{t("doneTitle")}</h3>
          <p className="max-w-sm text-sm text-muted-foreground">{t("doneDescription")}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="surface-panel rounded-2xl p-6" data-testid="update-password-card">
      <h2 className="mb-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {t("sectionSecurity")}
      </h2>
      <p className="mb-5 text-sm text-muted-foreground">{t("sectionSecurityDescription")}</p>

      {step === "form" ? (
        <form
          onSubmit={handleSubmit(onStep1Submit)}
          className="space-y-4"
          data-testid="password-step1"
        >
          <FormInput
            id="current-password"
            type="password"
            autoComplete="current-password"
            label={t("currentPassword")}
            placeholder={t("currentPasswordPlaceholder")}
            error={errors.currentPassword?.message}
            {...register("currentPassword")}
          />
          <FormInput
            id="new-password"
            type="password"
            autoComplete="new-password"
            label={t("newPassword")}
            placeholder={t("newPasswordPlaceholder")}
            error={errors.newPassword?.message}
            {...register("newPassword")}
          />
          <FormInput
            id="confirm-new-password"
            type="password"
            autoComplete="new-password"
            label={t("confirmNewPassword")}
            placeholder={t("confirmNewPasswordPlaceholder")}
            error={errors.confirmNewPassword?.message}
            {...register("confirmNewPassword")}
          />

          {formError ? <InlineAlert tone="error">{formError}</InlineAlert> : null}

          <div className="flex items-center justify-end gap-3">
            <LoadingButton
              type="submit"
              loading={requestOtp.isPending}
              loadingLabel={t("sendingCode")}
              className="h-10 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {t("sendCode")}
            </LoadingButton>
          </div>
        </form>
      ) : (
        <div className="space-y-5" data-testid="password-step2">
          <div className="rounded-xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
            <div className="flex items-start gap-2">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>{t("codeSentDescription")}</span>
            </div>
          </div>

          <OtpInput
            value={otp}
            onChange={setOtp}
            onComplete={onOtpComplete}
            autoFocus
            invalid={Boolean(otpError)}
            disabled={confirmOtp.isPending}
            ariaLabel={t("codeLabel")}
          />

          {otpError ? <InlineAlert tone="error">{otpError}</InlineAlert> : null}

          {confirmOtp.isPending ? (
            <div className={cn("flex items-center justify-center gap-2 text-sm text-muted-foreground")}>
              <Loader2 className="h-4 w-4 animate-spin" />
              {tCommon("states.loading")}
            </div>
          ) : null}

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {ttlSeconds > 0
                ? t("codeExpiresIn", { seconds: ttlSeconds })
                : t("codeExpired")}
            </span>
            <button
              type="button"
              onClick={resendCode}
              className="font-medium text-primary underline-offset-2 hover:underline"
            >
              {t("resendCode")}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}