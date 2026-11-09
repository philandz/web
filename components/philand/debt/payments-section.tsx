"use client";

import { useCallback } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/philand/data-table";
import { DateRangePicker } from "@/components/philand/filters/date-range-picker";
import { useListQuery } from "@/hooks/use-list-query";
import { validateRange } from "@/lib/date-range";
import { formatCurrency, formatIsoDate } from "@/lib/format";
import { useDebtPaymentsQuery } from "@/modules/debt/hooks";
import type { DebtAccount, DebtPaymentKind } from "@/services/debt-service";

interface PaymentsState {
  range: string;
  dateFrom: string;
  dateTo: string;
  kind: DebtPaymentKind | "all";
  /** 1-based for the UI; the API is 0-based. */
  page: number;
  pageSize: number;
}

const KINDS: DebtPaymentKind[] = ["scheduled", "prepayment", "settlement"];
const PAGE_SIZES = [20, 50, 100];

// A loan's history is read end to end, so the list starts on everything.
const defaults = (): PaymentsState => ({
  range: "all",
  dateFrom: "",
  dateTo: "",
  kind: "all",
  page: 1,
  pageSize: 20,
});

export function PaymentsSection({ budgetId, account }: { budgetId: string; account: DebtAccount }) {
  const t = useTranslations("budget.debt.detail");
  const tk = useTranslations("budget.debt");
  const locale = useLocale();
  const money = (v: number) => formatCurrency(v, account.currency || "VND", locale);

  const parse = useCallback(() => defaults(), []);
  const serialize = useCallback(() => {}, []);
  const { query, update, reset } = useListQuery<PaymentsState>({
    defaults,
    parse,
    serialize,
    persistInUrl: false,
  });

  const rangeError = validateRange(query.dateFrom, query.dateTo);
  const payments = useDebtPaymentsQuery(budgetId, account.id, {
    page: query.page - 1,
    pageSize: query.pageSize,
    filter: {
      dateFrom: query.dateFrom || undefined,
      dateTo: query.dateTo || undefined,
      kind: query.kind === "all" ? undefined : query.kind,
    },
    enabled: !rangeError,
  });
  const items = payments.data?.items ?? [];
  const totalRows = payments.data?.totalRows ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalRows / query.pageSize));
  const filtered = query.range !== "all" || query.kind !== "all";

  return (
    <Card>
      <CardContent className="space-y-3 p-4 text-sm" data-testid="debt-payments">
        <div className="flex flex-wrap items-center gap-2" data-testid="debt-payments-filters">
          <DateRangePicker
            value={{ range: query.range, from: query.dateFrom, to: query.dateTo }}
            onChange={(v) => update({ range: v.range, dateFrom: v.from, dateTo: v.to })}
          />
          <select
            aria-label={t("payFilter.kind")}
            value={query.kind}
            onChange={(e) => update({ kind: e.target.value as PaymentsState["kind"] })}
            className="h-8 rounded-lg border border-input bg-background px-2 text-xs text-foreground"
          >
            <option value="all">{t("payFilter.allKinds")}</option>
            {KINDS.map((k) => (
              <option key={k} value={k}>
                {tk(`payKind.${k}`)}
              </option>
            ))}
          </select>
          {filtered ? (
            <Button size="sm" variant="ghost" className="h-8 px-2 text-xs" onClick={() => reset()}>
              {t("payFilter.clear")}
            </Button>
          ) : null}
          <span className="ml-auto text-xs text-muted-foreground">{t("payFilter.count", { count: totalRows })}</span>
        </div>

        {payments.isError ? (
          <p className="text-destructive">
            {t("payFilter.error")}{" "}
            <button type="button" className="underline" onClick={() => payments.refetch()}>
              {t("payFilter.retry")}
            </button>
          </p>
        ) : items.length === 0 ? (
          <p className="text-muted-foreground">{filtered ? t("payFilter.noMatch") : t("noPayments")}</p>
        ) : null}

        <div className="space-y-1">
          {items.map((p) => (
            <div key={p.id} className="flex items-start justify-between gap-3 border-t border-border py-2 first:border-t-0">
              <div>
                <p className="font-medium">
                  {tk(`payKind.${p.kind}`)}
                  {p.status !== "completed" ? (
                    <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[11px] text-amber-800">{t(`payStatus.${p.status}`)}</span>
                  ) : null}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatIsoDate(p.paidOn, locale)} ·{" "}
                  {t("paymentSplit", { principal: money(p.principalMinor), interest: money(p.interestMinor), fee: money(p.feeMinor) })}
                </p>
              </div>
              <span className="shrink-0 font-semibold tabular-nums">{money(p.totalMinor)}</span>
            </div>
          ))}
        </div>

        {totalPages > 1 ? (
          <Pagination
            page={query.page}
            totalPages={totalPages}
            totalRows={totalRows}
            pageSize={query.pageSize}
            onPage={(p) => update({ page: p })}
            onPageSize={(sz) => update({ pageSize: sz })}
            pageSizeOptions={PAGE_SIZES}
          />
        ) : null}
      </CardContent>
    </Card>
  );
}
