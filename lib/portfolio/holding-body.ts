/**
 * Wire bodies for creating holdings inside a Saving fund (snake_case, numeric enums —
 * the gateway deserialises protobuf types directly).
 */
export type HoldingKind = "fixed-deposit" | "savings-account" | "gold-lot";
export type FundingSource = "cash-pocket" | "external";

export const FUNDING_SOURCE_WIRE: Record<FundingSource, number> = {
  "cash-pocket": 1,
  external: 2,
};

export interface HoldingFormValues {
  kind: HoldingKind;
  displayName: string;
  currency: string;
  provider: string;
  /** fixed deposit principal / savings balance / gold total cost, minor units */
  amount: number;
  /** percent per year, e.g. 5.5 */
  annualRate: number;
  /** YYYY-MM-DD: deposit/open/purchase date */
  date: string;
  /** YYYY-MM-DD, fixed deposit only */
  maturityDate?: string;
  /** gold only */
  quantity?: string;
  goldUnit?: "chi" | "luong" | "gram";
  pricePerUnit?: number;
  fees?: number;
  fundingSource: FundingSource;
  idempotencyKey: string;
}

export function isoToEpochSeconds(iso: string): number {
  return Math.floor(Date.parse(`${iso}T00:00:00Z`) / 1000);
}

const GOLD_UNIT_WIRE = { chi: 1, luong: 2, gram: 3 } as const;

export function buildHoldingBody(v: HoldingFormValues): Record<string, unknown> {
  const base = {
    display_name: v.displayName.trim(),
    currency: v.currency,
    provider: v.provider.trim(),
    notes: "",
    idempotency_key: v.idempotencyKey,
    funding_source: FUNDING_SOURCE_WIRE[v.fundingSource],
  };
  switch (v.kind) {
    case "fixed-deposit":
      return {
        ...base,
        product_name: "",
        principal: v.amount,
        annual_rate: v.annualRate,
        interest_method: 1, // simple
        payout_type: 1, // at maturity
        deposit_date: isoToEpochSeconds(v.date),
        maturity_date: isoToEpochSeconds(v.maturityDate ?? v.date),
        auto_renewal_policy: 1, // none
        certificate_reference_masked: "",
      };
    case "savings-account":
      return {
        ...base,
        account_reference_masked: "",
        current_balance: v.amount,
        balance_as_of: isoToEpochSeconds(v.date),
        annual_rate: v.annualRate,
        interest_method: 1,
        payout_type: 1,
        opened_on: isoToEpochSeconds(v.date),
      };
    case "gold-lot":
      return {
        ...base,
        gold_type: "gold",
        purity: 1, // SJC 9999
        form: 1, // bar
        quantity_original: v.quantity ?? "0",
        unit_original: GOLD_UNIT_WIRE[v.goldUnit ?? "chi"],
        purchase_price_per_unit_original: v.pricePerUnit ?? 0,
        fees: v.fees ?? 0,
        purchase_date: isoToEpochSeconds(v.date),
      };
  }
}

/** Client-side validation mirroring the server's required fields; returns an error key or null. */
export function validateHolding(v: HoldingFormValues): "name" | "amount" | "maturity" | "quantity" | null {
  if (!v.displayName.trim()) return "name";
  if (v.kind === "gold-lot") {
    if (!(Number(v.quantity) > 0) || !((v.pricePerUnit ?? 0) > 0)) return "quantity";
    return null;
  }
  if (!(v.amount > 0)) return "amount";
  if (v.kind === "fixed-deposit" && (!v.maturityDate || v.maturityDate <= v.date)) return "maturity";
  return null;
}
