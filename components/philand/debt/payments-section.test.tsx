import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import enBudget from "@/locales/en/budget.json";
import { PaymentsSection } from "./payments-section";
import type { DebtAccount } from "@/services/debt-service";

const usePayments = vi.fn();
vi.mock("@/modules/debt/hooks", () => ({
  useDebtPaymentsQuery: (...a: unknown[]) => usePayments(...a),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/i18n/navigation", () => ({ usePathname: () => "/x" }));

const account = { id: "a1", currency: "VND" } as DebtAccount;
const payment = (id: string) => ({
  id,
  kind: "scheduled",
  status: "completed",
  paidOn: "2026-10-01",
  principalMinor: 1000,
  interestMinor: 100,
  feeMinor: 0,
  totalMinor: 1100,
});

function ui() {
  return render(
    <NextIntlClientProvider locale="en" messages={{ budget: enBudget }} timeZone="UTC">
      <PaymentsSection budgetId="b1" account={account} />
    </NextIntlClientProvider>,
  );
}

beforeEach(() => {
  usePayments.mockReset();
  usePayments.mockReturnValue({ data: { items: [payment("p1")], totalRows: 1 }, isError: false, refetch: vi.fn() });
});
afterEach(cleanup);

describe("PaymentsSection", () => {
  it("starts unfiltered on the first (0-based) page", () => {
    ui();
    const [, , opts] = usePayments.mock.calls[0];
    expect(opts).toMatchObject({ page: 0, pageSize: 20, enabled: true });
    expect(opts.filter).toEqual({ dateFrom: undefined, dateTo: undefined, kind: undefined });
    expect(screen.getByText("1 payment")).toBeTruthy();
  });

  it("sends the chosen kind and returns to page 1", () => {
    ui();
    fireEvent.change(screen.getByLabelText("Payment type"), { target: { value: "prepayment" } });
    const [, , opts] = usePayments.mock.calls.at(-1)!;
    expect(opts.filter.kind).toBe("prepayment");
    expect(opts.page).toBe(0);
    expect(screen.getByText("Clear filters")).toBeTruthy();
  });

  it("explains an empty filtered result differently from an empty loan", () => {
    usePayments.mockReturnValue({ data: { items: [], totalRows: 0 }, isError: false, refetch: vi.fn() });
    ui();
    expect(screen.getByText("No payments recorded yet.")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Payment type"), { target: { value: "settlement" } });
    expect(screen.getByText("No payments match these filters.")).toBeTruthy();
  });
});
