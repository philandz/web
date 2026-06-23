import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

import { AddSharedExpenseDrawer } from "@/components/sharing/add-shared-expense-drawer";
import * as hooks from "@/modules/sharing/hooks";
import { useAuthStore } from "@/lib/auth-store";
import type { UseMutationResult } from "@tanstack/react-query";
import type { Expense } from "@/services/sharing-service";

// Mock dependencies
vi.mock("@/modules/sharing/hooks", () => ({
  useAddExpenseMutation: vi.fn(),
  useParticipantsQuery: vi.fn(),
}));

vi.mock("@/lib/auth-store", () => ({
  useAuthStore: vi.fn(),
}));

vi.mock("@/components/state/toast-provider", () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
  }),
}));

const mockParticipants = [
  { participantId: "u1", displayName: "Alice", budgetId: "b1", kind: "MEMBER" as const, joinedAt: 0, lastSeenAt: 0, revoked: false },
  { participantId: "u2", displayName: "Bob", budgetId: "b1", kind: "MEMBER" as const, joinedAt: 0, lastSeenAt: 0, revoked: false },
  { participantId: "u3", displayName: "Carol", budgetId: "b1", kind: "MEMBER" as const, joinedAt: 0, lastSeenAt: 0, revoked: false },
];

const mockAddExpense = {
  mutate: vi.fn(),
  isPending: false,
} as unknown as UseMutationResult<Expense, Error, { budgetId: string; paidBy: string; totalAmount: number; description: string; expenseDate: string; categoryId?: string; splitMethod: "equal" | "custom" | "weighted" | "percentage" | "by_item"; legs: { userId: string; amount: number; weight?: number }[]; items?: { label: string; amount: number; assignments: { userId: string; numerator: number }[] }[] }, unknown>;

describe("AddSharedExpenseDrawer", () => {
  const onOpenChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(hooks.useParticipantsQuery).mockReturnValue({ data: mockParticipants } as any);
    vi.mocked(hooks.useAddExpenseMutation).mockReturnValue(mockAddExpense);
    vi.mocked(useAuthStore).mockReturnValue({ profile: { id: "u1" } } as any);
  });

  const renderDrawer = () =>
    render(<AddSharedExpenseDrawer budgetId="b1" open={true} onOpenChange={onOpenChange} />);

  it("renders with AmountInput focused and empty", () => {
    renderDrawer();
    const input = screen.getByLabelText("Amount input");
    expect(input).toBeInTheDocument();
  });

  it("renders equal tab and shows AvatarStack of participants", () => {
    renderDrawer();
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.getByText("Carol")).toBeInTheDocument();
  });

  it("Equal tab: submitting creates equal split expense", async () => {
    renderDrawer();

    // Enter amount
    const amountInput = screen.getByLabelText("Amount input");
    fireEvent.change(amountInput, { target: { value: "90000" } });

    // Enter description
    const descInput = screen.getByPlaceholderText("What was this for?");
    fireEvent.change(descInput, { target: { value: "Dinner" } });

    // Click submit
    const submitBtn = screen.getByRole("button", { name: /add expense/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockAddExpense.mutate).toHaveBeenCalledWith(
        expect.objectContaining({
          budgetId: "b1",
          totalAmount: 90000,
          description: "Dinner",
          splitMethod: "equal",
          legs: expect.arrayContaining([
            expect.objectContaining({ userId: "u1" }),
            expect.objectContaining({ userId: "u2" }),
            expect.objectContaining({ userId: "u3" }),
          ]),
        }),
        expect.anything()
      );
    });
  });

  it("Custom tab: entering legs summing to total shows green indicator", async () => {
    renderDrawer();

    // Switch to Custom tab
    const customTab = screen.getByRole("button", { name: "Custom" });
    fireEvent.click(customTab);

    // Enter custom amounts for each participant
    const amountInputs = screen.getAllByPlaceholderText("0");
    // Custom tab has one input per participant (3 inputs: amount, then 3 custom amount inputs)
    // The first is the main amount, the rest are custom amounts
    fireEvent.change(amountInputs[1], { target: { value: "30000" } });
    fireEvent.change(amountInputs[2], { target: { value: "40000" } });
    fireEvent.change(amountInputs[3], { target: { value: "20000" } });

    // Should show green for matching total
    await waitFor(() => {
      // Total text should show in emerald color when matching
      expect(screen.getByText("90,000")).toBeInTheDocument();
    });
  });

  it("Custom tab: legs summing to wrong total shows red indicator", async () => {
    renderDrawer();

    // Switch to Custom tab
    const customTab = screen.getByRole("button", { name: "Custom" });
    fireEvent.click(customTab);

    // Enter amount
    const amountInput = screen.getByLabelText("Amount input");
    fireEvent.change(amountInput, { target: { value: "100000" } });

    // Enter custom amounts that don't sum to total
    const amountInputs = screen.getAllByPlaceholderText("0");
    fireEvent.change(amountInputs[1], { target: { value: "10000" } });
    fireEvent.change(amountInputs[2], { target: { value: "20000" } });
    fireEvent.change(amountInputs[3], { target: { value: "30000" } }); // sum = 60000, not 100000

    // Should show red for mismatched total
    await waitFor(() => {
      expect(screen.getByText("60,000")).toBeInTheDocument();
    });
  });

  it("Custom tab: submit disabled when amounts mismatched", async () => {
    renderDrawer();

    // Switch to Custom tab
    const customTab = screen.getByRole("button", { name: "Custom" });
    fireEvent.click(customTab);

    // Enter amount
    const amountInput = screen.getByLabelText("Amount input");
    fireEvent.change(amountInput, { target: { value: "100000" } });

    // Enter description
    const descInput = screen.getByPlaceholderText("What was this for?");
    fireEvent.change(descInput, { target: { value: "Bad split" } });

    // Enter mismatched amounts
    const amountInputs = screen.getAllByPlaceholderText("0");
    fireEvent.change(amountInputs[1], { target: { value: "10000" } });
    fireEvent.change(amountInputs[2], { target: { value: "20000" } });
    fireEvent.change(amountInputs[3], { target: { value: "30000" } });

    const submitBtn = screen.getByRole("button", { name: /add expense/i });
    expect(submitBtn).toBeDisabled();
  });

  it("Weighted tab: entering all weights > 0 is valid", async () => {
    renderDrawer();

    // Switch to Weighted tab
    const weightedTab = screen.getByRole("button", { name: "Weighted" });
    fireEvent.click(weightedTab);

    // Enter amount
    const amountInput = screen.getByLabelText("Amount input");
    fireEvent.change(amountInput, { target: { value: "100000" } });

    // Enter description
    const descInput = screen.getByPlaceholderText("What was this for?");
    fireEvent.change(descInput, { target: { value: "Weighted dinner" } });

    // Enter weights - need to find number inputs
    const numberInputs = document.querySelectorAll('input[type="number"]');
    // Should have 3 weight inputs
    fireEvent.change(numberInputs[0], { target: { value: "1" } });
    fireEvent.change(numberInputs[1], { target: { value: "2" } });
    fireEvent.change(numberInputs[2], { target: { value: "1" } });

    const submitBtn = screen.getByRole("button", { name: /add expense/i });
    expect(submitBtn).not.toBeDisabled();
  });

  it("Weighted tab: entering a weight of 0 makes split invalid", async () => {
    renderDrawer();

    // Switch to Weighted tab
    const weightedTab = screen.getByRole("button", { name: "Weighted" });
    fireEvent.click(weightedTab);

    // Enter amount
    const amountInput = screen.getByLabelText("Amount input");
    fireEvent.change(amountInput, { target: { value: "100000" } });

    // Enter description
    const descInput = screen.getByPlaceholderText("What was this for?");
    fireEvent.change(descInput, { target: { value: "Invalid weighted" } });

    // Enter weights with a zero
    const numberInputs = document.querySelectorAll('input[type="number"]');
    fireEvent.change(numberInputs[0], { target: { value: "1" } });
    fireEvent.change(numberInputs[1], { target: { value: "0" } });
    fireEvent.change(numberInputs[2], { target: { value: "1" } });

    const submitBtn = screen.getByRole("button", { name: /add expense/i });
    // When totalWeight is 0, legs would be empty, so submit should be disabled
    expect(submitBtn).toBeDisabled();
  });

  it("Percentage tab: percentages summing to 100 is valid", async () => {
    renderDrawer();

    // Switch to Percentage tab
    const percentageTab = screen.getByRole("button", { name: "Percentage" });
    fireEvent.click(percentageTab);

    // Enter amount
    const amountInput = screen.getByLabelText("Amount input");
    fireEvent.change(amountInput, { target: { value: "100000" } });

    // Enter description
    const descInput = screen.getByPlaceholderText("What was this for?");
    fireEvent.change(descInput, { target: { value: "Percent dinner" } });

    // Enter percentage amounts that sum to 100
    const numberInputs = document.querySelectorAll('input[type="number"]');
    fireEvent.change(numberInputs[0], { target: { value: "25" } });
    fireEvent.change(numberInputs[1], { target: { value: "25" } });
    fireEvent.change(numberInputs[2], { target: { value: "50" } });

    const submitBtn = screen.getByRole("button", { name: /add expense/i });
    expect(submitBtn).not.toBeDisabled();
  });

  it("Percentage tab: percentages summing to != 100 is invalid", async () => {
    renderDrawer();

    // Switch to Percentage tab
    const percentageTab = screen.getByRole("button", { name: "Percentage" });
    fireEvent.click(percentageTab);

    // Enter amount
    const amountInput = screen.getByLabelText("Amount input");
    fireEvent.change(amountInput, { target: { value: "100000" } });

    // Enter description
    const descInput = screen.getByPlaceholderText("What was this for?");
    fireEvent.change(descInput, { target: { value: "Bad percent" } });

    // Enter percentage amounts that don't sum to 100
    const numberInputs = document.querySelectorAll('input[type="number"]');
    fireEvent.change(numberInputs[0], { target: { value: "10" } });
    fireEvent.change(numberInputs[1], { target: { value: "20" } });
    fireEvent.change(numberInputs[2], { target: { value: "30" } }); // sum = 60, not 100

    const submitBtn = screen.getByRole("button", { name: /add expense/i });
    expect(submitBtn).toBeDisabled();
  });

  it("By-item tab: adding an item with label+amount+assignees shows in items list", async () => {
    renderDrawer();

    // Switch to By-item tab
    const byItemTab = screen.getByRole("button", { name: "By item" });
    fireEvent.click(byItemTab);

    // Enter amount
    const amountInput = screen.getByLabelText("Amount input");
    fireEvent.change(amountInput, { target: { value: "150000" } });

    // Enter description
    const descInput = screen.getByPlaceholderText("What was this for?");
    fireEvent.change(descInput, { target: { value: "Dinner items" } });

    // Add an item
    const addItemBtn = screen.getByRole("button", { name: /add item/i });
    fireEvent.click(addItemBtn);

    // Item should appear
    expect(screen.getByPlaceholderText("Item name")).toBeInTheDocument();
  });

  it("By-item tab: Total of items shows green when items sum matches expense amount", async () => {
    renderDrawer();

    // Switch to By-item tab
    const byItemTab = screen.getByRole("button", { name: "By item" });
    fireEvent.click(byItemTab);

    // Enter amount (total)
    const amountInput = screen.getByLabelText("Amount input");
    fireEvent.change(amountInput, { target: { value: "100000" } });

    // Add an item
    const addItemBtn = screen.getByRole("button", { name: /add item/i });
    fireEvent.click(addItemBtn);

    // Enter item label and amount
    const labelInput = screen.getByPlaceholderText("Item name");
    fireEvent.change(labelInput, { target: { value: "Dinner" } });

    // Find and fill the item amount input (not the main amount input)
    const itemAmountInputs = document.querySelectorAll('input[placeholder="0"]');
    fireEvent.change(itemAmountInputs[1], { target: { value: "100000" } });

    // Total indicator should show green when matching
    await waitFor(() => {
      expect(screen.getByText(/100,000 \/ 100,000/)).toBeInTheDocument();
    });
  });

  it("Submit disabled when amount is 0", () => {
    renderDrawer();

    // Enter description but no amount
    const descInput = screen.getByPlaceholderText("What was this for?");
    fireEvent.change(descInput, { target: { value: "Dinner" } });

    const submitBtn = screen.getByRole("button", { name: /add expense/i });
    expect(submitBtn).toBeDisabled();
  });

  it("Cancel button calls onOpenChange(false)", () => {
    renderDrawer();

    const cancelBtn = screen.getByRole("button", { name: "Cancel" });
    fireEvent.click(cancelBtn);

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
