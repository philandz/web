import React from "react";
import { screen, fireEvent, act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { render } from "@testing-library/react";
import enSharing from "@/locales/en/sharing.json";
import enBudget from "@/locales/en/budget.json";
import { SharingExpensesList } from "@/components/sharing/sharing-expenses-list";
import { buildExpenseQuery } from "@/services/sharing-service";

const usePage = vi.fn();

// The date picker reads the `budget` namespace; the app loads every namespace.
function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider
      locale="en"
      messages={{ sharing: enSharing, budget: enBudget }}
      timeZone="UTC"
    >
      {ui}
    </NextIntlClientProvider>,
  );
}

vi.mock("@/modules/sharing/hooks", () => ({
  useExpensesPageQuery: (...args: unknown[]) => usePage(...args),
  useParticipantsQuery: () => ({
    data: [
      { participantId: "p1", userId: "u1", displayName: "An" },
      { participantId: "p2", userId: "u2", displayName: "Binh" },
    ],
  }),
}));
vi.mock("@/modules/sharing/participant-name-lookup", () => ({
  useParticipantNameLookup: () => ({ resolve: (id: string) => `name-${id}` }),
}));
// the shared list-query hook reads the router; in-memory mode never navigates
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/i18n/navigation", () => ({ usePathname: () => "/x" }));

const expense = (id: string, amount: number, date = "2026-11-05") => ({
  id,
  budgetId: "b",
  paidBy: "u1",
  totalAmount: amount,
  description: `lunch ${id}`,
  expenseDate: date,
  categoryId: "",
  splitMethod: "equal",
  legs: [
    { userId: "u1", amount: amount / 2 },
    { userId: "u2", amount: amount / 2 },
  ],
});

function page(items: ReturnType<typeof expense>[], totalRows = items.length, totalAmount = 0) {
  return {
    data: {
      items,
      meta: { page: 1, pageSize: 50, totalPages: 1, totalRows, totalAmount },
    },
    isLoading: false,
    isError: false,
    isFetching: false,
    refetch: vi.fn(),
  };
}

beforeEach(() => usePage.mockReset());
afterEach(cleanup);

describe("buildExpenseQuery", () => {
  it("is empty for a bare query and drops defaults", () => {
    expect(buildExpenseQuery({})).toBe("");
    expect(buildExpenseQuery({ scope: "all", q: "  " })).toBe("");
  });

  it("joins ids with commas and names every filter", () => {
    const qs = new URLSearchParams(
      buildExpenseQuery({
        q: " cafe ",
        dateFrom: "2026-11-01",
        dateTo: "2026-11-30",
        paidByIds: ["a", "b"],
        shareParticipantIds: ["c"],
        scope: "shared",
        sortBy: "amount",
        sortDir: "asc",
        page: 2,
        pageSize: 20,
      }),
    );
    expect(qs.get("q")).toBe("cafe");
    expect(qs.get("paid_by_ids")).toBe("a,b");
    expect(qs.get("share_participant_ids")).toBe("c");
    expect(qs.get("scope")).toBe("shared");
    expect(qs.get("date_from")).toBe("2026-11-01");
    expect(qs.get("sort_by")).toBe("amount");
    expect(qs.get("page_size")).toBe("20");
  });
});

describe("SharingExpensesList", () => {
  it("starts on all time with no filters and asks the server for page 1", () => {
    usePage.mockReturnValue(page([expense("e1", 100)], 1, 100));
    renderWithIntl(<SharingExpensesList budgetId="b" />);
    const query = usePage.mock.calls[0][1];
    expect(query).toMatchObject({ dateFrom: "", dateTo: "", page: 1, scope: "all", paidByIds: [] });
    expect(screen.getByText("lunch e1")).toBeTruthy();
    // result bar: count + total over the whole match
    expect(screen.getByText("1 expense")).toBeTruthy();
  });

  it("shows the add-first state only when the budget is truly empty", () => {
    usePage.mockReturnValue(page([], 0, 0));
    renderWithIntl(<SharingExpensesList budgetId="b" onAddExpense={vi.fn()} />);
    expect(screen.queryByTestId("filter-bar")).toBeNull();
  });

  it("keeps the toolbar when a filter matches nothing, and offers to clear it", () => {
    usePage.mockImplementation((_id: string, q: { q?: string } = {}) =>
      q.q ? page([], 0, 0) : page([expense("e1", 100)], 1, 100),
    );
    renderWithIntl(<SharingExpensesList budgetId="b" />);
    vi.useFakeTimers();
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "zzz" } });
    act(() => {
      vi.advanceTimersByTime(400);
    });
    vi.useRealTimers();
    expect(screen.getByTestId("filter-bar")).toBeTruthy();
    expect(usePage.mock.calls.at(-1)?.[1]).toMatchObject({ q: "zzz", page: 1 });
    expect(screen.getByText("Clear all")).toBeTruthy();
  });

  it("masks the total for a guest on a private budget", () => {
    usePage.mockReturnValue(page([expense("e1", 123456)], 1, 123456));
    renderWithIntl(<SharingExpensesList budgetId="b" isGuest isPrivate />);
    expect(screen.queryByText(/123[.,]456/)).toBeNull();
  });
});
