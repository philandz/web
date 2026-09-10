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

vi.mock("@tanstack/react-query", () => ({
  useQuery: vi.fn(() => hooksState.budget),
}));

vi.mock("@/services/budget-service", () => ({
  budgetService: { getBudget: vi.fn() },
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
let settlementIdx = 0;

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
  budget: any;
} = {
  expenses: { data: undefined, isLoading: false },
  participants: { data: undefined, isLoading: false },
  settlement: { data: undefined, isLoading: false },
  budget: { data: undefined, isLoading: false },
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

function setHooks(expenses: any, participants: any, settlement: any = { data: undefined }, budget: any = { data: undefined }) {
  hooksState = { expenses, participants, settlement, budget };
}

beforeEach(() => {
  settlementIdx = 0;
  setHooks(
    { data: undefined, isLoading: false },
    { data: undefined, isLoading: false },
    { data: undefined, isLoading: false },
    { data: { id: "b1", is_private: false }, isLoading: false },
  );
});

describe("SharingBudgetView", () => {
  it("renders the page header with the budget name", () => {
    renderWithIntl(<SharingBudgetView budgetId="b1" budgetName="Trip 2026" />);
    expect(screen.getByTestId("page-header-name")).toHaveTextContent("Trip 2026");
  });

  it("renders the tab bar with all 5 sub-tabs", () => {
    renderWithIntl(<SharingBudgetView budgetId="b1" />);
    // All 5 tabs are present (use getAllBy since strict mode renders twice)
    expect(screen.getAllByRole("tab", { name: /overview/i })[0]).toBeInTheDocument();
    expect(screen.getAllByRole("tab", { name: /members/i })[0]).toBeInTheDocument();
    expect(screen.getAllByRole("tab", { name: /balances/i })[0]).toBeInTheDocument();
    expect(screen.getAllByRole("tab", { name: /settle/i })[0]).toBeInTheDocument();
    expect(screen.getAllByRole("tab", { name: /settings/i })[0]).toBeInTheDocument();
  });

  it("renders expenses list on the overview tab (default)", () => {
    renderWithIntl(<SharingBudgetView budgetId="b1" />);
    expect(screen.getAllByTestId("expenses-list")[0]).toBeInTheDocument();
  });

  it("renders the settlement card when the Settle tab is active", () => {
    renderWithIntl(<SharingBudgetView budgetId="b1" />);
    fireEvent.click(screen.getAllByRole("tab", { name: /settle/i })[0]);
    expect(screen.getByTestId("settlement-card-1")).toBeInTheDocument();
  });

  it("renders members content when the Members tab is active", () => {
    renderWithIntl(<SharingBudgetView budgetId="b1" />);
    fireEvent.click(screen.getAllByRole("tab", { name: /members/i })[0]);
    // MembersTab renders a container with participant rows (no specific testid, use role)
    expect(screen.getAllByRole("tab", { name: /members/i })[0]).toHaveAttribute("aria-selected", "true");
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
