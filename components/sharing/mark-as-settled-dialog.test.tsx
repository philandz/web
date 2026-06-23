import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

import { MarkAsSettledDialog } from "@/components/sharing/mark-as-settled-dialog";
import * as hooks from "@/modules/sharing/hooks";
import type { SettlementConfirmation } from "@/services/sharing-service";
import type { UseMutationResult } from "@tanstack/react-query";

vi.mock("@/modules/sharing/hooks", () => ({
  useMarkSettledMutation: vi.fn(),
}));

vi.mock("@/components/state/toast-provider", () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
  }),
}));

const mockTransfer = {
  fromParticipantId: "u1",
  fromName: "Alice",
  toParticipantId: "u2",
  toName: "Bob",
  amount: 50000,
};

type MarkSettledInput = {
  budgetId: string;
  fromParticipantId: string;
  toParticipantId: string;
  amount: number;
  settledAt: string;
  note?: string;
};

describe("MarkAsSettledDialog", () => {
  const onOpenChange = vi.fn();
  const mockMarkSettled = {
    mutate: vi.fn(),
    isPending: false,
  } as unknown as UseMutationResult<SettlementConfirmation, Error, MarkSettledInput, unknown>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(hooks.useMarkSettledMutation).mockReturnValue(mockMarkSettled as ReturnType<typeof hooks.useMarkSettledMutation>);
  });

  const renderDialog = () =>
    render(
      <MarkAsSettledDialog
        transfer={mockTransfer}
        budgetId="b1"
        open={true}
        onOpenChange={onOpenChange}
      />
    );

  it("renders transfer info with from/to names", () => {
    renderDialog();
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
    // Vietnamese locale: 50000 → "50.000"
    expect(screen.getByText(/50\.000/)).toBeInTheDocument();
  });

  it("renders with a note textarea", () => {
    renderDialog();
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("Cancel button calls onOpenChange(false)", () => {
    renderDialog();
    // Click the Cancel button (ghost variant, second button in footer)
    const buttons = screen.getAllByRole("button");
    const cancelBtn = buttons.find((b) => b.textContent === "Cancel");
    expect(cancelBtn).toBeInTheDocument();
    fireEvent.click(cancelBtn!);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("Confirm button calls mutate with correct args", async () => {
    renderDialog();
    const buttons = screen.getAllByRole("button");
    // The confirm button shows "Mark as settled" when not loading
    const confirmBtn = buttons.find((b) => b.textContent === "Mark as settled");
    expect(confirmBtn).toBeInTheDocument();
    fireEvent.click(confirmBtn!);
    await waitFor(() => {
      expect(mockMarkSettled.mutate).toHaveBeenCalled();
    });
  });
});
