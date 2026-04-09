import { z } from "zod";

type Translate = (key: string) => string;

export const createLoginFormSchema = (t: Translate) =>
  z.object({
    email: z.string().email(t("validation.email")),
    password: z.string().min(8, t("validation.passwordMin"))
  });

export type LoginFormValues = z.infer<ReturnType<typeof createLoginFormSchema>>;

export const createSignupFormSchema = (t: Translate) =>
  z
    .object({
      displayName: z.string().min(2, t("validation.nameShort")),
      email: z.string().email(t("validation.email")),
      password: z.string().min(8, t("validation.passwordMin")),
      confirmPassword: z.string().min(8, t("validation.passwordMin"))
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: t("validation.passwordMismatch"),
      path: ["confirmPassword"]
    });

export type SignupFormValues = z.infer<ReturnType<typeof createSignupFormSchema>>;

export const createForgotPasswordFormSchema = (t: Translate) =>
  z.object({
    email: z.string().email(t("validation.email"))
  });

export type ForgotPasswordFormValues = z.infer<ReturnType<typeof createForgotPasswordFormSchema>>;

export const createResetPasswordFormSchema = (t: Translate) =>
  z
    .object({
      newPassword: z.string().min(8, t("validation.passwordMin")),
      confirmPassword: z.string().min(8, t("validation.passwordMin"))
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
      message: t("validation.passwordMismatch"),
      path: ["confirmPassword"]
    });

export type ResetPasswordFormValues = z.infer<ReturnType<typeof createResetPasswordFormSchema>>;

export const createProfileFormSchema = (t: Translate) =>
  z.object({
    displayName: z.string().min(2, t("validation.displayNameShort")).max(80, t("validation.displayNameLong")),
    avatar: z.string().url(t("validation.avatarInvalid")).or(z.literal("")),
    bio: z.string().max(160, t("validation.bioLong")),
    timezone: z.string().max(50, t("validation.timezoneLong")),
    locale: z.string().max(20, t("validation.localeLong"))
  });

export type ProfileFormValues = z.infer<ReturnType<typeof createProfileFormSchema>>;
