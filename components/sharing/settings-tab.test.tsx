import React from "react";
import { screen, fireEvent, cleanup } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { renderWithIntl } from "@/test/render-with-intl";
import { SettingsTab } from "@/components/sharing/settings-tab";

const push = vi.fn();
let role: string = "owner";
let dialogProps: Record<string, any> = {};

vi.mock("@/i18n/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/modules/tenant/use-tenant-context", () => ({
  useTenantContext: () => ({ orgRole: role }),
}));
vi.mock("@/components/state/toast-provider", () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn() }),
}));
vi.mock("@/modules/sharing/hooks", () => ({
  useSettlementQuery: () => ({ data: { transfers: [] } }),
  useSharingStatusMutation: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock("@/services/budget-service", () => ({
  budgetService: { getBudget: vi.fn(), updateBudget: vi.fn() },
}));
vi.mock("@/components/sharing/private-budget-toggle", () => ({
  PrivateBudgetToggle: () => null,
}));
vi.mock("@/components/philand/budget-delete-dialog", () => ({
  BudgetDeleteDialog: (props: any) => {
    dialogProps = props;
    return props.open ? <div data-testid="delete-dialog">{props.budgetName}</div> : null;
  },
}));

const budget: any = {
  id: "b1",
  name: "Trip",
  currency: "VND",
  status: "active",
  myRole: "owner",
  isPrivate: false,
};

describe("Sharing SettingsTab delete", () => {
  afterEach(() => cleanup());
  beforeEach(() => {
    push.mockClear();
    dialogProps = {};
    role = "owner";
  });

  it("enables the delete button and opens the confirm dialog", () => {
    renderWithIntl(<SettingsTab budgetId="b1" initialBudget={budget} />);
    const btn = screen.getByRole("button", { name: "Delete this budget" });
    expect((btn as HTMLButtonElement).disabled).toBe(false);
    expect(screen.queryByTestId("delete-dialog")).toBeNull();
    fireEvent.click(btn);
    expect(screen.getByTestId("delete-dialog").textContent).toBe("Trip");
  });

  it("goes back to the budgets list after a successful delete", () => {
    renderWithIntl(<SettingsTab budgetId="b1" initialBudget={budget} />);
    dialogProps.onSuccess();
    expect(push).toHaveBeenCalledWith("/budgets");
  });

  it("hides delete for a member who is neither org owner nor budget owner", () => {
    role = "member";
    renderWithIntl(<SettingsTab budgetId="b1" initialBudget={{ ...budget, myRole: "member" }} />);
    expect(screen.queryByRole("button", { name: "Delete this budget" })).toBeNull();
  });
});
