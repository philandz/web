import React from "react";
import { screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MarkAsSettledDialog } from "@/components/sharing/mark-as-settled-dialog";
import { renderWithIntl } from "@/test/render-with-intl";

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h3>{children}</h3>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/money-amount", () => ({
  MoneyAmount: ({ value }: { value: number }) => <span>{value}</span>,
}));

vi.mock("@/components/ui/user-avatar", () => ({
  UserAvatar: ({ name }: { name: string }) => <div>{name}</div>,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, disabled }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean }) => (
    <button onClick={onClick} disabled={disabled}>{children}</button>
  ),
}));

vi.mock("@/components/state/toast-provider", () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn() }),
}));

const mockTransfer = {
  fromParticipantId: "u1",
  fromName: "Alice",
  toParticipantId: "u2",
  toName: "Bob",
  amount: 50000,
};

const noopMutation = { mutate: vi.fn(), isPending: false } as any;

vi.mock("@/modules/sharing/hooks", () => ({
  useMarkSettledMutation: vi.fn(() => noopMutation),
  useSettlementsQuery: vi.fn(() => ({ data: [] })),
}));

describe("MarkAsSettledDialog", () => {
  const onOpenChange = vi.fn();

  it("renders transfer info with from/to names and amount", () => {
    renderWithIntl(
      <MarkAsSettledDialog
        transfer={mockTransfer}
        budgetId="b1"
        open={true}
        onOpenChange={onOpenChange}
      />
    );
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.getByText(50000)).toBeInTheDocument();
  });

  it("renders with a note textarea", () => {
    renderWithIntl(
      <MarkAsSettledDialog
        transfer={mockTransfer}
        budgetId="b1"
        open={true}
        onOpenChange={onOpenChange}
      />
    );
    expect(screen.getAllByRole("textbox").length).toBeGreaterThan(0);
  });

  it("Cancel button calls onOpenChange(false)", () => {
    renderWithIntl(
      <MarkAsSettledDialog
        transfer={mockTransfer}
        budgetId="b1"
        open={true}
        onOpenChange={onOpenChange}
      />
    );
    const cancelBtns = screen.getAllByRole("button");
    const cancelBtn = cancelBtns.find((b) => b.textContent === "Cancel");
    expect(cancelBtn).toBeInTheDocument();
    fireEvent.click(cancelBtn!);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
