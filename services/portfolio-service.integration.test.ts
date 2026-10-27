import { describe, expect, it } from "vitest";
import { portfolioService } from "./portfolio-service";
import { sharingService } from "./sharing-service";
import { useAuthStore } from "@/lib/auth-store";
import { configureApiAuthHandlers } from "@/lib/http/client";

/**
 * Integration test against a live gateway.
 *
 * Run with:
 *   PHILANDZ_INTEGRATION=1 NEXT_PUBLIC_API_URL=http://127.0.0.1:9100 npm run test
 *
 * It is skipped by default so `npm run test` stays hermetic in CI.
 */
const LIVE = process.env.PHILANDZ_INTEGRATION === "1";

const API = process.env.NEXT_PUBLIC_API_URL ?? "";

// In the app this is wired by `providers/app-providers.tsx`; in a test there
// is no React tree, so wire it by hand.
configureApiAuthHandlers({ getToken: () => useAuthStore.getState().token });
const BUDGETS = `${API}/api/budget/budgets`;
const IDENTITY = `${API}/api/identity`;

async function login(email: string, password: string) {
  const res = await fetch(`${IDENTITY}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const text = await res.text();
  expect(res.status, text).toBe(200);
  return (JSON.parse(text) as { access_token: string }).access_token;
}

describe.skipIf(!LIVE)("portfolio service against a live gateway", () => {
  const email = `wire_${Date.now()}@philand.test`;
  const password = "Aa@123456";
  let token = "";
  let orgId = "";
  let savingId = "";
  let standardId = "";
  let sharingId = "";

  it("registers, creates a standard + a saving budget", async () => {
    await fetch(`${IDENTITY}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, display_name: "Wire" }),
    });
    token = await login(email, password);
    // The api client reads the bearer token from the auth store.
    useAuthStore.setState({ token, userType: "normal" });

    const orgs = await fetch(`${IDENTITY}/organizations`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((r) => r.json());
    orgId = (orgs.organizations ?? orgs)[0].base.id;

    const mk = async (name: string, budget_type: string) => {
      const res = await fetch(BUDGETS, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ org_id: orgId, name, budget_type, currency: "VND" }),
      });
      const text = await res.text();
      expect(res.status, text).toBe(201);
      return (JSON.parse(text) as { budget: { base: { id: string } } }).budget.base.id;
    };
    standardId = await mk(`Wire standard ${Date.now()}`, "standard");
    savingId = await mk(`Wire saving ${Date.now()}`, "saving");
    sharingId = await mk(`Wire sharing ${Date.now()}`, "sharing");
    expect(savingId).toBeTruthy();
    expect(sharingId).toBeTruthy();
  });

  it("reads the fund summary in camelCase", async () => {
    const summary = await portfolioService.getFundSummary(savingId);
    // These come straight off the gateway response — before the wire-format
    // fix they were all undefined.
    expect(summary.budgetId).toBe(savingId);
    expect(summary.currency).toBe("VND");
    expect(summary.totalValue).toBe(0);
    expect(summary.cashBalance).toBe(0);
    expect(typeof summary.growthPct).toBe("number");
  });

  it("moves money into the fund", async () => {
    const result = await portfolioService.depositToFund(savingId, {
      counterpartyBudgetId: standardId,
      amountMinor: 2_000_000,
      occurredOn: new Date().toISOString().slice(0, 10),
      note: "integration test",
      idempotencyKey: `wire-${Date.now()}`,
    });
    expect(result.cashBalance).toBe(2_000_000);
    expect(result.movement?.amountMinor).toBe(2_000_000);

    const summary = await portfolioService.getFundSummary(savingId);
    expect(summary.totalValue).toBe(2_000_000);
    expect(summary.netContributed).toBe(2_000_000);
  });

  it("reads the sharing balances and my balance in the group", async () => {
    const profile = (await fetch(`${IDENTITY}/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((r) => r.json())) as { id?: string; user?: { base?: { id?: string } } };
    // The gateway wraps the identity payload: `{ user: { base: { id } } }`.
    const myUserId = (profile.user?.base?.id ?? profile.id) as string;
    expect(myUserId, "current user id").toBeTruthy();

    // A second member joins through the share link, so the group really splits
    // a cost and both balances are non-zero.
    const mateEmail = `wire_mate_${Date.now()}@philand.test`;
    await fetch(`${IDENTITY}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: mateEmail, password, display_name: "Mate" }),
    });
    const mateToken = await login(mateEmail, password);
    const mateProfile = (await fetch(`${IDENTITY}/profile`, {
      headers: { Authorization: `Bearer ${mateToken}` },
    }).then((r) => r.json())) as { id?: string; user?: { base?: { id?: string } } };
    const mateUserId = (mateProfile.user?.base?.id ?? mateProfile.id) as string;

    const link = (await fetch(`${API}/api/sharing/budgets/${sharingId}/join-link`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: "{}",
    }).then((r) => r.json())) as { token: string };
    const joined = await fetch(`${API}/api/sharing/join-link/accept`, {
      method: "POST",
      headers: { Authorization: `Bearer ${mateToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ token: link.token }),
    });
    expect(joined.status, await joined.text()).toBe(200);

    // The mate pays 1 000 000, split evenly: I am owed 500 000.
    const add = await fetch(`${API}/api/sharing/budgets/${sharingId}/expenses`, {
      method: "POST",
      headers: { Authorization: `Bearer ${mateToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        paid_by: mateUserId,
        total_amount: 1_000_000,
        description: "Wire test",
        expense_date: new Date().toISOString().slice(0, 10),
        split_method: 1,
        legs: [
          { user_id: myUserId, amount: 500_000 },
          { user_id: mateUserId, amount: 500_000 },
        ],
      }),
    });
    const addText = await add.text();
    expect(add.status, addText).toBe(201);

    const balances = await sharingService.getBalances(sharingId);
    expect(balances.length).toBe(2);
    const mine = balances.find((b) => b.userId === myUserId);
    expect(mine, "my balance row").toBeTruthy();
    // The mate paid, so I owe half of it.
    expect(mine!.netBalance).toBe(-500_000);
    const theirs = balances.find((b) => b.userId === mateUserId);
    expect(theirs!.netBalance).toBe(500_000);
  });

  it("lists the fund movements", async () => {
    const movements = await portfolioService.listFundMovements(savingId, { page: 1, pageSize: 20 });
    expect(movements.movements?.length).toBeGreaterThan(0);
    expect(movements.movements?.[0].amountMinor).toBe(2_000_000);
  });
});
