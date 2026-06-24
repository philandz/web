import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ExpenseDetailSheet } from "@/components/sharing/expense-detail-sheet";
import type { Expense, ExpenseComment } from "@/services/sharing-service";

vi.mock("@/components/ui/sheet", () => ({
  Sheet: ({ children }: { children: React.ReactNode }) => <div data-testid="sheet">{children}</div>,
  SheetContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  SheetBody: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/money-amount", () => ({
  MoneyAmount: ({ value }: { value: number }) => <span data-testid={`money-${value}`}>{value}</span>,
}));

vi.mock("@/components/ui/user-avatar", () => ({
  UserAvatar: ({ name }: { name: string }) => <span data-testid={`avatar-${name}`}>{name}</span>,
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
}));

vi.mock("@/components/ui/confirm-dialog", () => ({
  ConfirmDialog: () => <div data-testid="confirm-dialog" />,
}));

vi.mock("@/components/state/toast-provider", () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn() }),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("@/lib/auth-store", () => ({
  useAuthStore: vi.fn((sel?: (s: { profile: { id: string; displayName: string } }) => unknown) =>
    sel ? sel({ profile: { id: "u1", displayName: "Alice" } }) : { profile: { id: "u1", displayName: "Alice" } }
  ),
}));

vi.mock("@/modules/sharing/participant-name-lookup", () => ({
  useParticipantNameLookup: () => ({
    resolve: (userId: string) => {
      if (userId === "u1") return "Alice";
      if (userId === "u2") return "Bob";
      if (userId.startsWith("g_")) return "Guest";
      return userId;
    },
  }),
}));

const expense: Expense = {
  id: "e1",
  budgetId: "b1",
  paidBy: "Alice",
  totalAmount: 90000,
  description: "Dinner",
  expenseDate: "2026-06-23",
  categoryId: undefined,
  splitMethod: "equal",
  legs: [
    { userId: "Alice", amount: 30000 },
    { userId: "Bob", amount: 30000 },
    { userId: "Carol", amount: 30000 },
  ],
  createdBy: "Alice",
  createdAt: Date.now() - 3600000,
  updatedAt: Date.now(),
};

const comments: ExpenseComment[] = [
  {
    id: "c1",
    expenseId: "e1",
    authorParticipantId: "u1",
    authorDisplayName: "Alice",
    body: "Great dinner!",
    createdAt: Date.now() - 1800000,
    deleted: false,
  },
];

const noopMutation = { mutate: vi.fn(), isPending: false } as any;

vi.mock("@/modules/sharing/hooks", () => ({
  useCommentsQuery: vi.fn(() => ({ data: comments })),
  useAddCommentMutation: vi.fn(() => noopMutation),
  useDeleteCommentMutation: vi.fn(() => noopMutation),
}));

describe("ExpenseDetailSheet", () => {
  const onOpenChange = vi.fn();

  it("renders null when expense is null", () => {
    const { container } = render(
      <ExpenseDetailSheet expense={null} open={true} onOpenChange={onOpenChange} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders expense description", () => {
    render(<ExpenseDetailSheet expense={expense} open={true} onOpenChange={onOpenChange} />);
    expect(screen.getByText("Dinner")).toBeInTheDocument();
  });

  it("renders split breakdown with participant names", () => {
    render(<ExpenseDetailSheet expense={expense} open={true} onOpenChange={onOpenChange} />);
    // Names appear in split breakdown and potentially comments
    expect(screen.getAllByText("Alice").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Bob").length).toBeGreaterThan(0);
  });

  it("renders comments", () => {
    render(<ExpenseDetailSheet expense={expense} open={true} onOpenChange={onOpenChange} />);
    // Multiple instances may render due to Sheet mock — check at least one exists
    expect(screen.getAllByText("Great dinner!").length).toBeGreaterThan(0);
  });

  it("Close button calls onOpenChange(false)", () => {
    render(<ExpenseDetailSheet expense={expense} open={true} onOpenChange={onOpenChange} />);
    const closeBtns = screen.getAllByRole("button");
    const closeBtn = closeBtns.find((b) => b.textContent === "form.close");
    expect(closeBtn).toBeInTheDocument();
    fireEvent.click(closeBtn!);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
