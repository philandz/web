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
    vi.mocked(hooks.useMarkSettledMutation).mockReturnValue(mockMarkSettled);
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

  it("renders transfer info: 'fromName → toName: amount'", () => {
    renderDialog();

    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.getByText("50,000")).toBeInTheDocument();
  });

  it("Confirm button disabled when mutation is loading", () => {
    const pendingMutation = {
      mutate: mockMarkSettled.mutate,
      isPending: true,
    } as unknown as UseMutationResult<SettlementConfirmation, Error, MarkSettledInput, unknown>;

    vi.mocked(hooks.useMarkSettledMutation).mockReturnValue(pendingMutation);

    renderDialog();

    const confirmBtn = screen.getByRole("button", { name: /mark as settled/i });
    expect(confirmBtn).toBeDisabled();
  });

  it("On confirm: markSettled mutation called with correct args", async () => {
    renderDialog();

    const confirmBtn = screen.getByRole("button", { name: /mark as settled/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(mockMarkSettled.mutate).toHaveBeenCalledWith(
        expect.objectContaining({
          budgetId: "b1",
          fromParticipantId: "u1",
          toParticipantId: "u2",
          amount: 50000,
          settledAt: expect.any(String),
        }),
        expect.anything()
      );
    });
  });

  it("Success: dialog closes via onOpenChange", async () => {
    let capturedOnSuccess:
      | ((data: SettlementConfirmation, variables: MarkSettledInput) => void)
      | undefined;
    vi.mocked(mockMarkSettled.mutate).mockImplementation((_input, options) => {
      capturedOnSuccess = options?.onSuccess as typeof capturedOnSuccess;
    });

    renderDialog();

    const confirmBtn = screen.getByRole("button", { name: /mark as settled/i });
    fireEvent.click(confirmBtn);

    // Simulate mutation success
    if (capturedOnSuccess) {
      capturedOnSuccess({} as SettlementConfirmation, {} as MarkSettledInput);
    }

    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it("Cancel button calls onOpenChange(false)", () => {
    renderDialog();

    const cancelBtn = screen.getByRole("button", { name: "Cancel" });
    fireEvent.click(cancelBtn);

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("renders with a note textarea", () => {
    renderDialog();

    expect(screen.getByLabelText(/note/i)).toBeInTheDocument();
  });

  it("can enter a note before confirming", async () => {
    renderDialog();

    const noteTextarea = screen.getByLabelText(/note/i) as HTMLTextAreaElement;
    fireEvent.change(noteTextarea, { target: { value: "Paid via bank transfer" } });

    const confirmBtn = screen.getByRole("button", { name: /mark as settled/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(mockMarkSettled.mutate).toHaveBeenCalledWith(
        expect.objectContaining({
          note: "Paid via bank transfer",
        }),
        expect.anything()
      );
    });
  });
});
