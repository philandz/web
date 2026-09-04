import React from "react";
import { screen, cleanup } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { InvestBudgetView } from "@/components/philand/invest-budget-view";
import { renderWithIntl } from "@/test/render-with-intl";

// -------------------------------------------------------------------------- //
// Shared test state — single mutable object shared by all mocks
// Using vi.hoisted so it is available to vi.mock factories (no TDZ issue)
// -------------------------------------------------------------------------- //

const testState = vi.hoisted(() => ({
  orgRole: "member" as "owner" | "member" | "viewer",
  assets: [] as any[],
}));

// -------------------------------------------------------------------------- //
// Mocked sub-components
// -------------------------------------------------------------------------- //

vi.mock("@/components/state/toast-provider", () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn() }),
}));

vi.mock("@/modules/invest/hooks", () => ({
  useInvestAssetsQuery: vi.fn(() => ({ data: testState.assets, isLoading: false })),
  usePortfolioSummaryQuery: vi.fn().mockReturnValue({ data: undefined }),
  usePriceSnapshotsQuery: vi.fn().mockReturnValue({ data: [] }),
  useAddPriceSnapshotMutation: vi.fn().mockReturnValue({ mutate: vi.fn(), isPending: false }),
  useCreateAssetMutation: vi.fn().mockReturnValue({ mutate: vi.fn(), isPending: false }),
  useUpdateAssetMutation: vi.fn().mockReturnValue({ mutate: vi.fn(), isPending: false }),
}));

vi.mock("@/components/invest/asset-delete-dialog", () => ({
  AssetDeleteDialog: ({ asset, open }: any) =>
    open ? <div data-testid="delete-dialog">{asset?.id}</div> : null,
}));

vi.mock("@/components/invest/asset-edit-dialog", () => ({
  AssetEditDialog: ({ asset, open }: any) =>
    open ? <div data-testid="edit-dialog">{asset?.id}</div> : null,
}));

vi.mock("@/components/ui/sheet", () => ({
  Sheet: ({ open }: any) => (open ? <div data-testid="history-sheet" /> : null),
  SheetContent: vi.fn(({ children }) => <>{children}</>),
  SheetClose: vi.fn(),
  SheetFooter: vi.fn(),
  SheetHeader: vi.fn(),
  SheetTitle: vi.fn(),
  SheetBody: vi.fn(),
}));

vi.mock("@/lib/auth-store", () => ({
  useAuthStore: vi.fn((sel?: (s: any) => unknown) => {
    const state = {
      hydrated: true,
      userType: "user" as const,
      organizations: [{ id: "org1", name: "Test Org", role: testState.orgRole }],
      selectedOrgId: "org1",
      token: "fake-token",
      profile: null,
      sessionNotice: null,
    };
    return sel ? sel(state) : state;
  }),
}));

vi.mock("@/modules/tenant/use-tenant-context", () => ({
  useTenantContext: vi.fn(() => ({
    userType: "user",
    organizations: [{ id: "org1", name: "Test Org", role: testState.orgRole }],
    selectedOrgId: "org1",
    selectedOrganization: { id: "org1", name: "Test Org", role: testState.orgRole },
    orgRole: testState.orgRole,
    permissions: [],
    hasOrganizations: true,
    isOrgSelected: true,
  })),
}));

// -------------------------------------------------------------------------- //
// Shared test asset — gold type so UpdatePrice + Edit/Delete are gate candidates
// -------------------------------------------------------------------------- //

const goldAsset = {
  id: "asset-gold-1",
  name: "Gold Savings Q3/2026",
  assetType: "gold" as const,
  currentValue: 50_000_000,
  costBasisPerUnit: 85_000_000,
  quantity: 0.6,
  unit: "tael" as const,
  principal: 50_000_000,
  unrealizedPnl: 1_000_000,
  pnlPct: 2.0,
  maturityDate: undefined as undefined,
  lastUpdated: "2026-09-01",
  exchange: undefined as never,
  ticker: undefined as never,
};

// -------------------------------------------------------------------------- //
// Tests
// -------------------------------------------------------------------------- //

describe("InvestBudgetView owner-only gating (T3.1 regression)", () => {
  beforeEach(() => {
    testState.orgRole = "member";
    testState.assets = [];
  });

  afterEach(() => {
    cleanup();
  });

  // ------------------------------------------------------------------------- //
  // Non-owner: buttons must be absent
  // ------------------------------------------------------------------------- //

  it("hides UpdatePrice button when orgRole is member", () => {
    testState.assets = [goldAsset];
    renderWithIntl(<InvestBudgetView budgetId="b1" myRole="member" />);
    expect(screen.queryByTestId("update-price-btn")).not.toBeInTheDocument();
  });

  it("hides Edit / Delete dropdown when orgRole is member", () => {
    testState.assets = [goldAsset];
    renderWithIntl(<InvestBudgetView budgetId="b1" myRole="member" />);
    // Asset card renders
    expect(screen.getByText("Gold Savings Q3/2026")).toBeInTheDocument();
    // UpdatePrice button absent
    expect(screen.queryByTestId("update-price-btn")).not.toBeInTheDocument();
    // DropdownMenuTrigger (ChevronDown) is absent when orgRole is member
    const chevronIcon = document.querySelector('svg.lucide-chevron-down');
    expect(chevronIcon).not.toBeInTheDocument();
  });

  it("hides UpdatePrice button when orgRole is viewer", () => {
    testState.orgRole = "viewer";
    testState.assets = [goldAsset];
    renderWithIntl(<InvestBudgetView budgetId="b1" myRole="viewer" />);
    expect(screen.queryByTestId("update-price-btn")).not.toBeInTheDocument();
  });

  it("hides Edit / Delete dropdown when orgRole is viewer", () => {
    testState.orgRole = "viewer";
    testState.assets = [goldAsset];
    renderWithIntl(<InvestBudgetView budgetId="b1" myRole="viewer" />);
    // Asset card renders
    expect(screen.getByText("Gold Savings Q3/2026")).toBeInTheDocument();
    // UpdatePrice button absent
    expect(screen.queryByTestId("update-price-btn")).not.toBeInTheDocument();
    // DropdownMenuTrigger (ChevronDown) is absent when orgRole is viewer
    const chevronIcon = document.querySelector('svg.lucide-chevron-down');
    expect(chevronIcon).not.toBeInTheDocument();
  });

  // ------------------------------------------------------------------------- //
  // Owner: buttons must be present
  // ------------------------------------------------------------------------- //

  it("shows UpdatePrice button when orgRole is owner", () => {
    testState.orgRole = "owner";
    testState.assets = [goldAsset];
    renderWithIntl(<InvestBudgetView budgetId="b1" myRole="owner" />);
    expect(screen.getByTestId("update-price-btn")).toBeInTheDocument();
  });

  it("shows Edit / Delete dropdown when orgRole is owner", () => {
    testState.orgRole = "owner";
    testState.assets = [goldAsset];
    renderWithIntl(<InvestBudgetView budgetId="b1" myRole="owner" />);
    // Asset card renders
    expect(screen.getByText("Gold Savings Q3/2026")).toBeInTheDocument();
    // UpdatePrice button renders
    expect(screen.getByTestId("update-price-btn")).toBeInTheDocument();
    // DropdownMenuTrigger (ChevronDown button) is present when orgRole is owner
    // Look for the ChevronDown icon by its class
    const chevronIcon = document.querySelector('svg.lucide-chevron-down');
    expect(chevronIcon).toBeInTheDocument();
  });
});
