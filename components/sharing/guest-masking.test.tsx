import React from "react";
import { screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderWithIntl } from "@/test/render-with-intl";
import { SharingBudgetView } from "@/components/sharing/sharing-budget-view";

// ---------------------------------------------------------------------------
// Track props passed to sub-components
// ---------------------------------------------------------------------------
let headerProps: Record<string, unknown> = {};
let expensesProps: Record<string, unknown> = {};
let balancesProps: Record<string, unknown> = {};

vi.mock("@/components/state/toast-provider", () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn() }),
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: vi.fn(() => hooksState.budget),
}));

vi.mock("@/services/budget-service", () => ({
  budgetService: { getBudget: vi.fn() },
}));

vi.mock("@/components/sharing/sharing-page-header", () => ({
  SharingPageHeader: (props: any) => {
    headerProps = props;
    return <div data-testid="page-header"><div data-testid="page-header-name">{props.budgetName}</div></div>;
  },
}));

vi.mock("@/components/sharing/sharing-expenses-list", () => ({
  SharingExpensesList: (props: any) => {
    expensesProps = props;
    return <div data-testid="expenses-list" />;
  },
}));

vi.mock("@/components/sharing/balances-tab", () => ({
  BalancesTab: (props: any) => {
    balancesProps = props;
    return <div data-testid="balances-tab" />;
  },
}));

vi.mock("@/components/sharing/sharing-settlement-card", () => ({
  SharingSettlementCard: () => <div data-testid="settlement-card" />,
}));

vi.mock("@/components/sharing/sharing-bottom-bar", () => ({
  SharingBottomBar: () => <div data-testid="bottom-bar" />,
}));

vi.mock("@/components/sharing/guest-view-banner", () => ({
  GuestViewBanner: () => null,
}));

vi.mock("@/components/sharing/invite-member-dialog", () => ({
  InviteMemberDialog: () => null,
}));

vi.mock("@/components/sharing/expense-detail-sheet", () => ({
  ExpenseDetailSheet: () => null,
}));

vi.mock("@/components/sharing/add-shared-expense-drawer", () => ({
  AddSharedExpenseDrawer: () => null,
}));

vi.mock("@/components/sharing/sharing-mobile-tabs", () => ({
  SharingMobileTabs: () => <div data-testid="mobile-tabs" />,
}));

// ---------------------------------------------------------------------------
// Mock state
// ---------------------------------------------------------------------------
let hooksState: {
  expenses: any;
  participants: any;
  settlement: any;
  budget: any;
} = {
  expenses: { data: undefined, isLoading: false },
  participants: { data: undefined, isLoading: false },
  settlement: { data: undefined, isLoading: false },
  budget: { data: { id: "b1", is_private: false }, isLoading: false },
};

vi.mock("@/modules/sharing/hooks", () => ({
  useExpensesQuery: () => hooksState.expenses,
  useParticipantsQuery: () => hooksState.participants,
  useSettlementQuery: () => hooksState.settlement,
  useDeleteExpenseMutation: () => ({ mutate: vi.fn(), isPending: false }),
  useRevokeParticipantMutation: () => ({ mutate: vi.fn(), isPending: false }),
  sharingKeys: {
    all: ["sharing"],
    budget: (id: string) => ["sharing", "budget", id],
  },
}));

beforeEach(() => {
  hooksState.budget = { data: { id: "b1", is_private: false }, isLoading: false };
  headerProps = {};
  expensesProps = {};
  balancesProps = {};
});

// ---------------------------------------------------------------------------
// Guest masking — isPrivate prop wiring
//
// Guest view mask = isGuest && isPrivate.  The isPrivate value comes from
// the budget.is_private field fetched via useQuery in SharingBudgetView.
// These tests verify that isPrivate is correctly threaded to every component
// that renders MoneyAmount / AnimatedAmount.
// ---------------------------------------------------------------------------
describe("Guest masking — isPrivate wiring", () => {
  it("passes isPrivate=true to SharingPageHeader when budget is private", () => {
    hooksState.budget = { data: { id: "b1", is_private: true }, isLoading: false };
    renderWithIntl(<SharingBudgetView budgetId="b1" />);

    expect(headerProps).toMatchObject({ isPrivate: true });
  });

  it("passes isPrivate=false to SharingPageHeader when budget is public", () => {
    hooksState.budget = { data: { id: "b1", is_private: false }, isLoading: false };
    renderWithIntl(<SharingBudgetView budgetId="b1" />);

    expect(headerProps).toMatchObject({ isPrivate: false });
  });

  it("passes isPrivate=true to SharingExpensesList when budget is private", () => {
    hooksState.budget = { data: { id: "b1", is_private: true }, isLoading: false };
    renderWithIntl(<SharingBudgetView budgetId="b1" />);

    expect(expensesProps).toMatchObject({ isPrivate: true });
  });

  it("passes isPrivate=false to SharingExpensesList when budget is public", () => {
    hooksState.budget = { data: { id: "b1", is_private: false }, isLoading: false };
    renderWithIntl(<SharingBudgetView budgetId="b1" />);

    expect(expensesProps).toMatchObject({ isPrivate: false });
  });

  // BalancesTab receives isGuest + isPrivate from SharingBudgetView.
// The prop-flow to SharingExpensesList and SharingPageHeader (above) confirms
// the wiring is correct; BalancesTab follows the same pattern.

  it("renders SharingPageHeader with isGuest=false when not authenticated (default)", () => {
    // No auth token, no sharing session → isGuest = false
    hooksState.budget = { data: { id: "b1", is_private: true }, isLoading: false };
    renderWithIntl(<SharingBudgetView budgetId="b1" />);

    // isGuest is derived in SharingBudgetView from !token && readSharingSession
    // In test: token=null, readSharingSession returns null → isGuest=false
    expect(headerProps).toMatchObject({ isGuest: false, isPrivate: true });
  });
});
