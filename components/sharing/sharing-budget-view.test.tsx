import React from "react";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { SharingBudgetView } from "@/components/sharing/sharing-budget-view";

afterEach(() => {
  cleanup();
});

vi.mock("@/components/state/toast-provider", () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn() }),
}));

vi.mock("@/components/sharing/shell", () => ({
  Shell: ({ children, budgetName, rightRail }: any) => (
    <div data-testid="shell">
      <div data-testid="shell-name">{budgetName}</div>
      <div data-testid="shell-main">{children}</div>
      <div data-testid="shell-right-rail">{rightRail}</div>
    </div>
  ),
}));

vi.mock("@/components/sharing/sharing-settlement-card", () => ({
  SharingSettlementCard: () => <div data-testid="settlement-card" />,
}));
vi.mock("@/components/sharing/sharing-expenses-list", () => ({
  SharingExpensesList: ({ onExpenseClick, onAddExpense }: any) => (
    <div data-testid="expenses-list">
      <button onClick={onAddExpense}>add</button>
      <button
        onClick={() =>
          onExpenseClick({
            id: "e1",
            totalAmount: 100,
            description: "x",
          } as any)
        }
      >
        click-first
      </button>
    </div>
  ),
}));
vi.mock("@/components/sharing/sharing-members-card", () => ({
  SharingMembersCard: () => <div data-testid="members-card" />,
}));
// ActivityLogList is rendered twice (right rail + mobile fallback) — use unique testids.
let activityLogIdx = 0;
vi.mock("@/components/sharing/activity-log-list", () => ({
  ActivityLogList: () => {
    activityLogIdx += 1;
    return <div data-testid={`activity-log-${activityLogIdx}`} />;
  },
}));
vi.mock("@/components/sharing/expense-detail-sheet", () => ({
  ExpenseDetailSheet: ({ open, expense }: any) =>
    open ? <div data-testid="expense-detail">{expense?.id}</div> : null,
}));
vi.mock("@/components/sharing/add-shared-expense-drawer", () => ({
  AddSharedExpenseDrawer: ({ open }: any) =>
    open ? <div data-testid="add-drawer" /> : null,
}));
vi.mock("@/components/sharing/staggered-mount", () => ({
  StaggeredMount: ({ children }: any) => <>{children}</>,
}));

vi.mock("@/components/ui/money-amount", () => ({
  MoneyAmount: ({ value }: { value: number }) => <span>{value}</span>,
}));
vi.mock("@/components/ui/avatar-stack", () => ({
  AvatarStack: () => <div data-testid="avatar-stack" />,
}));
vi.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick }: any) => (
    <button onClick={onClick}>{children}</button>
  ),
}));

// Mutable mock state — change per test using `setHooks()`.
let hooksState: {
  expenses: any;
  participants: any;
} = {
  expenses: { data: undefined, isLoading: false },
  participants: { data: undefined, isLoading: false },
};

vi.mock("@/modules/sharing/hooks", () => ({
  useExpensesQuery: () => hooksState.expenses,
  useParticipantsQuery: () => hooksState.participants,
}));

function setHooks(expenses: any, participants: any) {
  hooksState = { expenses, participants };
}

beforeEach(() => {
  activityLogIdx = 0;
  setHooks(
    { data: undefined, isLoading: false },
    { data: undefined, isLoading: false }
  );
});

describe("SharingBudgetView", () => {
  it("renders the shell with the budget name", () => {
    render(<SharingBudgetView budgetId="b1" budgetName="Trip 2026" />);
    expect(screen.getByTestId("shell-name")).toHaveTextContent("Trip 2026");
  });

  it("renders the expenses list and members card sections", () => {
    render(<SharingBudgetView budgetId="b1" />);
    expect(screen.getByTestId("expenses-list")).toBeInTheDocument();
    expect(screen.getByTestId("members-card")).toBeInTheDocument();
    // Activity log renders twice (right rail + mobile fallback).
    expect(screen.getByTestId("activity-log-1")).toBeInTheDocument();
    expect(screen.getByTestId("activity-log-2")).toBeInTheDocument();
  });

  it("renders the avatar stack when participants are present", () => {
    setHooks(
      { data: undefined, isLoading: false },
      {
        data: [
          { participantId: "u1", displayName: "Alice", kind: "MEMBER" as const },
          { participantId: "u2", displayName: "Bob", kind: "MEMBER" as const },
        ],
        isLoading: false,
      }
    );
    render(<SharingBudgetView budgetId="b1" />);
    expect(screen.getByTestId("avatar-stack")).toBeInTheDocument();
  });

  it("clicking an expense opens the detail sheet", () => {
    setHooks(
      { data: [{ id: "e1", totalAmount: 100000 }], isLoading: false },
      {
        data: [
          { participantId: "u1", displayName: "Alice", kind: "MEMBER" as const },
        ],
        isLoading: false,
      }
    );
    render(<SharingBudgetView budgetId="b1" />);
    fireEvent.click(screen.getByText("click-first"));
    expect(screen.getByTestId("expense-detail")).toHaveTextContent("e1");
  });

  it("clicking add expense opens the drawer", () => {
    render(<SharingBudgetView budgetId="b1" />);
    // The header has "Add expense"; the expenses-list mock has "add"
    fireEvent.click(screen.getByText("Add expense"));
    expect(screen.getByTestId("add-drawer")).toBeInTheDocument();
  });
});
