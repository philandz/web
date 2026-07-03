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
  }
};
