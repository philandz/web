import { apiClient } from "@/lib/http/client";

const BASE = "/api/identity";

export type ResendKeySource = "db" | "env" | "none";

export interface ResendConfig {
  configured: boolean;
  source: ResendKeySource;
  maskedKey: string;
  fromAddress: string;
  replyTo: string;
}

export interface UpdateResendConfigInput {
  apiKey: string;
  fromAddress: string;
  replyTo?: string;
}

export interface TestResendConfigInput {
  recipientEmail: string;
}

export interface TestResendConfigResult {
  messageId: string;
}

// ----- System environment (URLs, locale, From, support) -----

export type SystemConfigSource = "db" | "env" | "default";

export interface SystemConfig {
  appPublicBaseUrl: string;
  supportEmail: string;
  defaultLocale: string;
  mailFromAddress: string;
  sourceAppPublicBaseUrl: SystemConfigSource;
  sourceSupportEmail: SystemConfigSource;
  sourceDefaultLocale: SystemConfigSource;
  sourceMailFromAddress: SystemConfigSource;
}

export interface UpdateSystemConfigInput {
  appPublicBaseUrl: string;
  supportEmail: string;
  defaultLocale: string;
  mailFromAddress: string;
}

export const adminSettingsService = {
  /**
   * Read the current Resend configuration. Super-admin only.
   * Never returns the raw API key — only a masked `***LAST4` value.
   */
  async getResendConfig(): Promise<ResendConfig> {
    const raw = await apiClient.get<{
      configured: boolean;
      source: string;
      masked_key: string;
      from_address: string;
      reply_to: string;
    }>(`${BASE}/settings/resend`);
    return {
      configured: raw.configured,
      source: (raw.source as ResendKeySource) ?? "none",
      maskedKey: raw.masked_key ?? "",
      fromAddress: raw.from_address ?? "",
      replyTo: raw.reply_to ?? ""
    };
  },

  /**
   * Persist a new Resend configuration. The API key is encrypted at rest
   * server-side and never returned through this or any other RPC.
   */
  async updateResendConfig(input: UpdateResendConfigInput): Promise<ResendConfig> {
    const raw = await apiClient.patch<{
      current: {
        configured: boolean;
        source: string;
        masked_key: string;
        from_address: string;
        reply_to: string;
      };
    }>(`${BASE}/settings/resend`, {
      api_key: input.apiKey,
      from_address: input.fromAddress,
      reply_to: input.replyTo ?? ""
    });
    return {
      configured: raw.current.configured,
      source: (raw.current.source as ResendKeySource) ?? "none",
      maskedKey: raw.current.masked_key ?? "",
      fromAddress: raw.current.from_address ?? "",
      replyTo: raw.current.reply_to ?? ""
    };
  },

  /**
   * Send a one-off test message via Resend. Useful for confirming SPF/DKIM
   * setup before relying on the platform for real flows.
   */
  async testResendConfig(input: TestResendConfigInput): Promise<TestResendConfigResult> {
    const raw = await apiClient.post<{ message_id: string }>(
      `${BASE}/settings/resend/test`,
      { recipient_email: input.recipientEmail }
    );
    return { messageId: raw.message_id };
  },

  /**
   * Read the system environment config (URLs, support email, locale, From).
   * Each field includes a `source` indicator so the admin knows what's
   * stored in the DB vs. coming from env.
   */
  async getSystemConfig(): Promise<SystemConfig> {
    const raw = await apiClient.get<{
      app_public_base_url: string;
      support_email: string;
      default_locale: string;
      mail_from_address: string;
      source_app_public_base_url: string;
      source_support_email: string;
      source_default_locale: string;
      source_mail_from_address: string;
    }>(`${BASE}/settings/system`);
    return mapSystemConfig(raw);
  },

  /**
   * Persist a new system config. Values override env on next read so the
   * admin can stop hard-coding URLs/locale in the deployment.
   */
  async updateSystemConfig(input: UpdateSystemConfigInput): Promise<SystemConfig> {
    const raw = await apiClient.patch<{
      current: Parameters<typeof mapSystemConfig>[0];
    }>(`${BASE}/settings/system`, {
      app_public_base_url: input.appPublicBaseUrl,
      support_email: input.supportEmail,
      default_locale: input.defaultLocale,
      mail_from_address: input.mailFromAddress
    });
    return mapSystemConfig(raw.current);
  }
};

function mapSystemConfig(raw: {
  app_public_base_url: string;
  support_email: string;
  default_locale: string;
  mail_from_address: string;
  source_app_public_base_url: string;
  source_support_email: string;
  source_default_locale: string;
  source_mail_from_address: string;
}): SystemConfig {
  return {
    appPublicBaseUrl: raw.app_public_base_url ?? "",
    supportEmail: raw.support_email ?? "",
    defaultLocale: raw.default_locale ?? "",
    mailFromAddress: raw.mail_from_address ?? "",
    sourceAppPublicBaseUrl:
      (raw.source_app_public_base_url as SystemConfigSource) ?? "default",
    sourceSupportEmail:
      (raw.source_support_email as SystemConfigSource) ?? "default",
    sourceDefaultLocale:
      (raw.source_default_locale as SystemConfigSource) ?? "default",
    sourceMailFromAddress:
      (raw.source_mail_from_address as SystemConfigSource) ?? "default"
  };
}
