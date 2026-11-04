import { apiClient } from "@/lib/http/client";
import { camelToSnake, snakeToCamel } from "@/lib/wire-casing";

const BASE = "/api/budget";

export type DebtKind = "consumer" | "mortgage" | "car" | "installment" | "personal" | "other";
export type DebtMethod =
  | "annuity"
  | "equal_principal"
  | "interest_only"
  | "fixed_installments"
  | "no_schedule";
export type DebtPaymentKind = "scheduled" | "prepayment" | "settlement";
export type PrepayEffect = "reduce_term" | "reduce_installment";
export type DebtStatus = "active" | "settled" | "closed";

export interface RatePeriod {
  id?: string;
  effectiveFrom: string;
  annualRate: string;
  rateType: "fixed" | "floating";
  note?: string;
}

export interface PrepayRule {
  id?: string;
  validFrom: string;
  validTo?: string;
  freeAllowancePerMonthMinor: number;
  feePct: string;
  minFeeMinor?: number;
  note?: string;
}

export interface NextDue {
  dueDate: string;
  principalMinor: number;
  interestMinor: number;
  feeMinor: number;
  totalMinor: number;
  estimated: boolean;
}

export interface DebtAccount {
  id: string;
  budgetId: string;
  name: string;
  lender: string;
  kind: DebtKind;
  repaymentMethod: DebtMethod;
  currency: string;
  openingOutstandingMinor: number;
  outstandingMinor: number;
  trackingStartDate: string;
  maturityDate: string;
  remainingPeriods: number;
  dueDay: number;
  periodicFeeMinor: number;
  dayCount: string;
  interestCategoryId: string;
  payFromBudgetId: string;
  status: DebtStatus;
  version: number;
  nextDue?: NextDue | null;
  ratePeriods: RatePeriod[];
  prepayRules: PrepayRule[];
  paidPrincipalMinor: number;
  totalPaidMinor: number;
  totalCostMinor: number;
  estimatedPayoffDate: string;
}

export interface DebtBookSummary {
  budgetId: string;
  currency: string;
  totalOutstandingMinor: number;
  dueThisMonthMinor: number;
  nextDueDate: string;
  nextDueMinor: number;
  nextDueAccountId: string;
  totalPaidMinor: number;
  totalCostMinor: number;
  activeAccounts: number;
  settledAccounts: number;
}

export interface ScheduleRow {
  seq: number;
  dueDate: string;
  principalMinor: number;
  interestMinor: number;
  feeMinor: number;
  totalMinor: number;
  balanceAfterMinor: number;
  annualRate: string;
  estimated: boolean;
}

export interface DebtSchedule {
  rows: ScheduleRow[];
  payoffDate: string;
  totalInterestMinor: number;
  estimated: boolean;
}

export interface QuoteBody {
  kind: DebtPaymentKind;
  paidOn?: string;
  prepayAmountMinor?: number;
  prepayEffect?: PrepayEffect;
}

export interface PaymentQuote {
  principalMinor: number;
  interestMinor: number;
  feeMinor: number;
  totalMinor: number;
  suggestedFeeMinor: number;
  allowanceUsedMinor: number;
  allowanceRemainingMinor: number;
  dueDate: string;
  interestFrom: string;
  interestTo: string;
  days: number;
  annualRate: string;
  outstandingAfterMinor: number;
  estimated: boolean;
}

export interface RecordPaymentBody {
  kind: DebtPaymentKind;
  paidOn: string;
  principalMinor: number;
  interestMinor: number;
  feeMinor: number;
  fromBudgetId: string;
  categoryId?: string;
  prepayEffect?: PrepayEffect;
  note?: string;
  idempotencyKey: string;
  dueDate?: string;
  feeOverridden?: boolean;
}

export interface DebtPayment {
  id: string;
  accountId: string;
  budgetId: string;
  paidOn: string;
  kind: DebtPaymentKind;
  principalMinor: number;
  interestMinor: number;
  feeMinor: number;
  totalMinor: number;
  prepayEffect: string;
  suggestedFeeMinor: number;
  fromBudgetId: string;
  entryGroupId: string;
  status: string;
  note: string;
  dueDate: string;
  createdAt: number;
  actorUserId: string;
}

export interface RecordPaymentResult {
  payment: DebtPayment;
  outstandingMinor: number;
  suggestSettle: boolean;
}

export interface DebtEvent {
  id: string;
  accountId: string;
  kind: string;
  amountMinor: number;
  payload: string;
  actorUserId: string;
  occurredOn: string;
  createdAt: number;
}

export interface CreateDebtAccountBody {
  name: string;
  lender?: string;
  kind: DebtKind;
  repaymentMethod: DebtMethod;
  openingOutstandingMinor: number;
  trackingStartDate: string;
  maturityDate?: string;
  remainingPeriods?: number;
  dueDay: number;
  periodicFeeMinor?: number;
  dayCount?: string;
  interestCategoryId?: string;
  payFromBudgetId?: string;
  ratePeriods: RatePeriod[];
  prepayRules?: PrepayRule[];
}

export type UpdateDebtAccountBody = Partial<
  Pick<
    DebtAccount,
    | "name"
    | "lender"
    | "kind"
    | "dueDay"
    | "periodicFeeMinor"
    | "maturityDate"
    | "dayCount"
    | "interestCategoryId"
    | "payFromBudgetId"
  >
> & { expectedVersion?: number };

export interface Paged<T> {
  items: T[];
  totalRows: number;
}

const root = (b: string) => `${BASE}/budgets/${b}/debt`;
const acc = (b: string, a: string) => `${root(b)}/accounts/${a}`;
const wire = (o: unknown) => camelToSnake<Record<string, unknown>>(o);
const rd = <T>(p: Promise<unknown>) => p.then((raw) => snakeToCamel<T>(raw));

export const debtService = {
  summary: (b: string) => rd<DebtBookSummary>(apiClient.get(`${root(b)}/summary`)),
  listAccounts: (b: string, includeClosed = false) =>
    rd<{ accounts?: DebtAccount[] }>(
      apiClient.get(`${root(b)}/accounts${includeClosed ? "?include_closed=true" : ""}`),
    ).then((r) => r.accounts ?? []),
  getAccount: (b: string, a: string) => rd<DebtAccount>(apiClient.get(acc(b, a))),
  createAccount: (b: string, body: CreateDebtAccountBody) =>
    rd<DebtAccount>(apiClient.post(`${root(b)}/accounts`, wire({ ...body, budgetId: b }))),
  updateAccount: (b: string, a: string, body: UpdateDebtAccountBody) =>
    rd<DebtAccount>(apiClient.patch(acc(b, a), wire({ ...body, budgetId: b, accountId: a }))),
  closeAccount: (b: string, a: string) => rd<DebtAccount>(apiClient.post(`${acc(b, a)}/close`, {})),
  reopenAccount: (b: string, a: string) => rd<DebtAccount>(apiClient.post(`${acc(b, a)}/reopen`, {})),
  settleAccount: (b: string, a: string) => rd<DebtAccount>(apiClient.post(`${acc(b, a)}/settle`, {})),
  setRate: (b: string, a: string, rate: RatePeriod) =>
    rd<DebtAccount>(apiClient.post(`${acc(b, a)}/rates`, wire(rate))),
  deleteRate: (b: string, a: string, id: string) =>
    rd<DebtAccount>(apiClient.request(`${acc(b, a)}/rates/${id}`, { method: "DELETE" })),
  setRule: (b: string, a: string, rule: PrepayRule) =>
    rd<DebtAccount>(apiClient.post(`${acc(b, a)}/prepay-rules`, wire(rule))),
  deleteRule: (b: string, a: string, id: string) =>
    rd<DebtAccount>(apiClient.request(`${acc(b, a)}/prepay-rules/${id}`, { method: "DELETE" })),
  schedule: (b: string, a: string, maxRows = 0) =>
    rd<DebtSchedule>(apiClient.get(`${acc(b, a)}/schedule${maxRows ? `?max_rows=${maxRows}` : ""}`)).then(
      (r) => ({ ...r, rows: r.rows ?? [] }),
    ),
  quote: (b: string, a: string, body: QuoteBody) =>
    rd<PaymentQuote>(apiClient.post(`${acc(b, a)}/quote`, wire(body))),
  recordPayment: (b: string, a: string, body: RecordPaymentBody) =>
    rd<RecordPaymentResult>(apiClient.post(`${acc(b, a)}/payments`, wire(body))),
  adjust: (
    b: string,
    a: string,
    body: { newOutstandingMinor: number; reason: string; occurredOn?: string; idempotencyKey: string },
  ) => rd<DebtAccount>(apiClient.post(`${acc(b, a)}/adjust`, wire(body))),
  listPayments: (b: string, accountId = "", page = 0, pageSize = 50) =>
    rd<{ payments?: DebtPayment[]; totalRows?: number }>(
      apiClient.get(`${root(b)}/payments?account_id=${accountId}&page=${page}&page_size=${pageSize}`),
    ).then((r) => ({ items: r.payments ?? [], totalRows: Number(r.totalRows ?? 0) }) as Paged<DebtPayment>),
  listEvents: (b: string, accountId = "", page = 0, pageSize = 50) =>
    rd<{ events?: DebtEvent[]; totalRows?: number }>(
      apiClient.get(`${root(b)}/events?account_id=${accountId}&page=${page}&page_size=${pageSize}`),
    ).then((r) => ({ items: r.events ?? [], totalRows: Number(r.totalRows ?? 0) }) as Paged<DebtEvent>),
};
