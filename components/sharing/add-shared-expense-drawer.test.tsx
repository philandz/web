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

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
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
  useSettlementQuery: vi.fn(() => ({ data: [] })),
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
    // With participants set but no amount entered, the button shows
    // "Add participants to continue" (or "Add expense" depending on
    // state). The contract being tested is: it's disabled. Match
    // either copy and assert disabled.
    const addBtns = screen
      .getAllByRole("button")
      .filter((b) =>
        b.textContent?.includes("Add expense") ||
        b.textContent?.includes("Add participants to continue") ||
        b.textContent?.includes("loading") ||
        // After locale refactor, button labels resolve to next-intl keys in tests.
        b.textContent === "form.submit" ||
        b.textContent === "splitMethod.needParticipants" ||
        b.textContent === "form.submitting",
      );
    expect(addBtns.length).toBeGreaterThan(0);
    addBtns.forEach((b) => expect(b).toBeDisabled());
  });

  it("cancel button calls onOpenChange(false)", () => {
    render(<AddSharedExpenseDrawer budgetId="b1" open={true} onOpenChange={onOpenChange} />);
    // Cancel is in SheetFooter; the test mock returns the i18n key as-is
    const buttons = screen.getAllByRole("button");
    const cancelBtn = buttons.find((b) => b.textContent === "form.cancel");
    expect(cancelBtn).toBeInTheDocument();
    fireEvent.click(cancelBtn!);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
