import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { AddSharedExpenseDrawer } from "@/components/sharing/add-shared-expense-drawer";
import type { ParticipantInfo } from "@/services/sharing-service";

vi.mock("@/components/ui/sheet", () => ({
  Sheet: ({ children }: { children: React.ReactNode }) => <div data-testid="sheet">{children}</div>,
  SheetContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  SheetBody: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/amount-input", () => ({
  AmountInput: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <input data-testid="amount-input" type="text" value={value} onChange={(e) => onChange(e.target.value)} />
  ),
}));

vi.mock("@/components/ui/segmented-control", () => ({
  SegmentedControl: ({ options, value, onChange }: { options: { value: string; label: string }[]; value: string; onChange: (v: string) => void }) => (
    <div data-testid="tabs">
      {options.map((opt) => (
        <button key={opt.value} onClick={() => onChange(opt.value)}>{opt.label}</button>
      ))}
    </div>
  ),
}));

vi.mock("@/components/state/toast-provider", () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn() }),
}));

vi.mock("@/lib/auth-store", () => ({
  useAuthStore: () => ({ profile: { id: "u1" } }),
}));

const participants: ParticipantInfo[] = [
  { participantId: "u1", budgetId: "b1", kind: "MEMBER", displayName: "Alice", joinedAt: 0, lastSeenAt: 0, revoked: false },
  { participantId: "u2", budgetId: "b1", kind: "MEMBER", displayName: "Bob", joinedAt: 0, lastSeenAt: 0, revoked: false },
];

const noopMutation = { mutate: vi.fn(), isPending: false } as any;

vi.mock("@/modules/sharing/hooks", () => ({
  useParticipantsQuery: vi.fn(() => ({ data: participants })),
  useAddExpenseMutation: vi.fn(() => noopMutation),
}));

describe("AddSharedExpenseDrawer", () => {
  const onOpenChange = vi.fn();

  it("renders amount input and tabs", () => {
    render(<AddSharedExpenseDrawer budgetId="b1" open={true} onOpenChange={onOpenChange} />);
    expect(screen.getByTestId("amount-input")).toBeInTheDocument();
    expect(screen.getByTestId("tabs")).toBeInTheDocument();
  });

  it("shows participant names", () => {
    render(<AddSharedExpenseDrawer budgetId="b1" open={true} onOpenChange={onOpenChange} />);
    // Alice appears twice (button and possibly elsewhere) — use getAllByText
    expect(screen.getAllByText("Alice").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Bob").length).toBeGreaterThan(0);
  });

  it("disables submit when amount is 0", () => {
    render(<AddSharedExpenseDrawer budgetId="b1" open={true} onOpenChange={onOpenChange} />);
    // Multiple buttons may exist due to Sheet mock; check at least one exists and is disabled
    const addBtns = screen.getAllByRole("button").filter((b) => b.textContent?.includes("Add expense"));
    expect(addBtns.length).toBeGreaterThan(0);
    addBtns.forEach((b) => expect(b).toBeDisabled());
  });

  it("cancel button calls onOpenChange(false)", () => {
    render(<AddSharedExpenseDrawer budgetId="b1" open={true} onOpenChange={onOpenChange} />);
    // Cancel is in SheetFooter
    const buttons = screen.getAllByRole("button");
    const cancelBtn = buttons.find((b) => b.textContent === "Cancel");
    expect(cancelBtn).toBeInTheDocument();
    fireEvent.click(cancelBtn!);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
