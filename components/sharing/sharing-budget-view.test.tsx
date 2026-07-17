import React from "react";
import { screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { SharingBudgetView } from "@/components/sharing/sharing-budget-view";
import { renderWithIntl } from "@/test/render-with-intl";

// The view composes many shared sub-components. Mock the heavy ones
// so each test focuses on the orchestrator's contract.

vi.mock("@/components/state/toast-provider", () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn() }),
}));

vi.mock("@/components/sharing/sharing-page-header", () => ({
  SharingPageHeader: ({ budgetName, onInviteClick, onAddExpenseClick }: any) => (
    <div data-testid="page-header">
      <div data-testid="page-header-name">{budgetName}</div>
      <button data-testid="hdr-invite" onClick={onInviteClick}>invite</button>
      <button data-testid="hdr-add" onClick={onAddExpenseClick}>Add expense</button>
    </div>
  ),
}));

// Use unique testids so multi-render instances (desktop + mobile) can be
// queried with getAllByTestId without ambiguity.
let membersIdx = 0;
let settlementIdx = 0;
let activityIdx = 0;

vi.mock("@/components/sharing/sharing-members-card", () => ({
  SharingMembersCard: () => {
    membersIdx += 1;
    return <div data-testid={`members-card-${membersIdx}`} />;
  },
}));

vi.mock("@/components/sharing/sharing-expenses-list", () => ({
  SharingExpensesList: ({ onExpenseClick, onAddExpense }: any) => (
    <div data-testid="expenses-list">
      <button onClick={onAddExpense}>add-expense</button>
      <button
        onClick={() =>
          onExpenseClick({ id: "e1", totalAmount: 100, description: "x" } as any)
        }
      >
        click-first
      </button>
    </div>
  ),
}));

vi.mock("@/components/sharing/sharing-settlement-card", () => ({
  SharingSettlementCard: () => {
    settlementIdx += 1;
    return <div data-testid={`settlement-card-${settlementIdx}`} />;
  },
}));

vi.mock("@/components/sharing/activity-log-list", () => ({
  ActivityLogList: () => {
    activityIdx += 1;
    return <div data-testid={`activity-log-${activityIdx}`} />;
  },
}));

vi.mock("@/components/sharing/sharing-mobile-tabs", () => ({
  SharingMobileTabs: () => <div data-testid="mobile-tabs" />,
}));

vi.mock("@/components/sharing/sharing-bottom-bar", () => ({
  SharingBottomBar: () => <div data-testid="bottom-bar" />,
}));

vi.mock("@/components/sharing/expense-detail-sheet", () => ({
  ExpenseDetailSheet: ({ open, expense }: any) =>
    open ? <div data-testid="expense-detail">{expense?.id}</div> : null,
}));

vi.mock("@/components/sharing/add-shared-expense-drawer", () => ({
  AddSharedExpenseDrawer: ({ open }: any) =>
    open ? <div data-testid="add-drawer" /> : null,
}));

vi.mock("@/components/sharing/invite-member-dialog", () => ({
  InviteMemberDialog: ({ open, onOpenChange }: any) =>
    open ? (
      <div data-testid="invite-dialog">
        <button onClick={() => onOpenChange(false)}>close</button>
      </div>
    ) : null,
}));

// Mutable mock state — change per test using `setHooks()`.
let hooksState: {
  expenses: any;
  participants: any;
  settlement: any;
} = {
  expenses: { data: undefined, isLoading: false },
  participants: { data: undefined, isLoading: false },
  settlement: { data: undefined, isLoading: false },
};

vi.mock("@/modules/sharing/hooks", () => ({
  useExpensesQuery: () => hooksState.expenses,
  useParticipantsQuery: () => hooksState.participants,
  useSettlementQuery: () => hooksState.settlement,
  useDeleteExpenseMutation: () => ({ mutate: vi.fn(), isPending: false }),
}));

function setHooks(expenses: any, participants: any, settlement = { data: undefined }) {
  hooksState = { expenses, participants, settlement };
}

beforeEach(() => {
  membersIdx = 0;
  settlementIdx = 0;
  activityIdx = 0;
  setHooks(
    { data: undefined, isLoading: false },
    { data: undefined, isLoading: false },
  );
});

describe("SharingBudgetView", () => {
  it("renders the page header with the budget name", () => {
    renderWithIntl(<SharingBudgetView budgetId="b1" budgetName="Trip 2026" />);
    expect(screen.getByTestId("page-header-name")).toHaveTextContent("Trip 2026");
  });

  it("renders the settlement card, expenses list, and members card", () => {
    renderWithIntl(<SharingBudgetView budgetId="b1" />);
    expect(screen.getAllByTestId(/^settlement-card-/)[0]).toBeInTheDocument();
    expect(screen.getAllByTestId("expenses-list").length).toBeGreaterThan(0);
    expect(screen.getAllByTestId(/^members-card-/)[0]).toBeInTheDocument();
    // Activity log renders in two slots (right rail + mobile fallback).
    expect(screen.getAllByTestId(/^activity-log-/).length).toBeGreaterThan(0);
  });

  it("clicking an expense opens the detail sheet", () => {
    setHooks(
      { data: [{ id: "e1", totalAmount: 100000 }], isLoading: false },
      { data: [], isLoading: false },
    );
    renderWithIntl(<SharingBudgetView budgetId="b1" />);
    fireEvent.click(screen.getAllByText("click-first")[0]);
    expect(screen.getByTestId("expense-detail")).toHaveTextContent("e1");
  });

  it("clicking Add expense opens the drawer", () => {
    renderWithIntl(<SharingBudgetView budgetId="b1" />);
    fireEvent.click(screen.getAllByText("Add expense")[0]);
    expect(screen.getByTestId("add-drawer")).toBeInTheDocument();
  });

  it("clicking the header Invite button opens the invite dialog", () => {
    renderWithIntl(<SharingBudgetView budgetId="b1" />);
    fireEvent.click(screen.getAllByTestId("hdr-invite")[0]);
    expect(screen.getByTestId("invite-dialog")).toBeInTheDocument();
  });
});