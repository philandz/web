# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: invest-budget-full-flow.spec.ts >> Invest budget full CRUD >> empty invest budget renders empty state + logout
- Location: e2e/invest-budget-full-flow.spec.ts:181:7

# Error details

```
Error: no access token in localStorage

expect(received).toBeTruthy()

Received: ""
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - main [ref=e2]:
    - generic [ref=e3]:
      - generic [ref=e5]:
        - generic [ref=e6]:
          - img "Philand" [ref=e7]
          - generic [ref=e8]: Philand
        - generic [ref=e9]:
          - heading "Create account" [level=1] [ref=e10]
          - paragraph [ref=e11]: Set up your workspace access.
        - generic [ref=e13]:
          - generic [ref=e14]:
            - text: Full name
            - textbox "Full name" [ref=e15]:
              - /placeholder: Your name
              - text: E2E Empty
          - generic [ref=e16]:
            - text: Email
            - textbox "Email" [ref=e17]:
              - /placeholder: name@company.com
              - text: register-1786432425071-122219@philand.local
          - generic [ref=e18]:
            - text: Password
            - textbox "Password" [ref=e19]:
              - /placeholder: At least 8 characters
              - text: Aa@123456
          - generic [ref=e20]:
            - text: Confirm password
            - textbox "Confirm password" [ref=e21]:
              - /placeholder: Repeat your password
              - text: Aa@123456
          - alert [ref=e22]: Network request failed
          - button "Create account" [ref=e23] [cursor=pointer]:
            - generic [ref=e24]: Create account
          - paragraph [ref=e25]:
            - text: Already have an account?
            - link "Sign in" [ref=e26] [cursor=pointer]:
              - /url: /en/login
        - generic [ref=e27]:
          - generic [ref=e28]:
            - generic [ref=e29]: Language
            - combobox "Language" [ref=e30]:
              - option "English" [selected]
              - option "Vietnamese"
          - generic [ref=e32]:
            - button "Light" [ref=e33] [cursor=pointer]:
              - img [ref=e34]
            - button "Dark" [ref=e40] [cursor=pointer]:
              - img [ref=e41]
            - button "System" [ref=e43] [cursor=pointer]:
              - img [ref=e44]
      - generic [ref=e48]:
        - generic [ref=e49]:
          - heading "Plan better. Spend smarter." [level=2] [ref=e51]
          - paragraph [ref=e52]: Track budgets, collaborate with your team, and keep control of every transaction.
        - generic [ref=e54]:
          - generic [ref=e55]:
            - generic [ref=e56]: Monthly Balance
            - generic [ref=e57]: +12.4%
          - paragraph [ref=e58]: $84,921.00
          - generic [ref=e60]:
            - generic [ref=e61]: Budget used
            - generic [ref=e62]: 60%
  - alert [ref=e65]
```

# Test source

```ts
  1   | import { test, expect, Page, request } from '@playwright/test';
  2   | 
  3   | import {
  4   |   assertAssetCard,
  5   |   logout,
  6   |   navigateToInvestBudget,
  7   |   skipOrgSelection,
  8   | } from './helpers';
  9   | // (navigateToInvestBudget + assertAssetCard are still used by the
  10  | // empty-budget and vi-locale tests below; the API CRUD test deliberately
  11  | // covers the read path via the API to avoid the auth-hydration race that
  12  | // causes the page error boundary to fire intermittently.)
  13  | 
  14  | /**
  15  |  * Full UI CRUD for the invest-budget (asset portfolio) feature.
  16  |  *
  17  |  * Scope:
  18  |  *   Legacy 3-class flow (Savings deposit / Gold lot / Stock lot) via
  19  |  *   `components/philand/invest-budget-view.tsx`. The typed portfolio router
  20  |  *   in `gateway/src/portfolio/mod.rs` is disabled pending compile errors
  21  |  *   against tonic 0.12 + the ErrorEnvelope shape refactor, so Fixed Deposit /
  22  |  *   ETF / Crypto classes are out of scope here.
  23  |  *
  24  |  * Auth flow:
  25  |  *   `registerAndLogin` (UI-based, auto-login after signup, post-A.3 fix).
  26  |  *   The invest budget is created via the gateway's `POST /api/budget/budgets`
  27  |  *   using a Bearer token read from the persisted auth state (page.request
  28  |  *   does not auto-add auth headers, and /api/budget/* requires a Bearer).
  29  |  *   `page.goto('/budgets/{id}')` then drives the UI for read-side CRUD
  30  |  *   (asset cards, edit kebab, update price, archive). Write-side CRUD
  31  |  *   uses the API directly because the legacy `AddAssetDialog` form inputs
  32  |  *   are not associated with their `<Label>` siblings, so `getByLabel` does
  33  |  *   not match and per-input selectors drift between en/vi locales.
  34  |  */
  35  | 
  36  | interface ApiAsset {
  37  |   id: string;
  38  |   name: string;
  39  |   asset_type: string;
  40  | }
  41  | 
  42  | async function readAuthFromStorage(page: Page): Promise<{ token: string; orgId: string }> {
  43  |   const raw = await page.evaluate(() => localStorage.getItem('philandz-web-auth'));
  44  |   const parsed = raw ? JSON.parse(raw) : null;
  45  |   const state = parsed?.state ?? {};
  46  |   const token: string = state?.token ?? '';
  47  |   // The org id can live at `base.id` (raw API shape) or `id` (normalized
  48  |   // shape used by the (dashboard) layout). Handle both.
  49  |   const orgId: string =
  50  |     state?.selectedOrgId ??
  51  |     state?.organizations?.[0]?.base?.id ??
  52  |     state?.organizations?.[0]?.id ??
  53  |     '';
  54  |   return { token, orgId };
  55  | }
  56  | 
  57  | async function createInvestBudget(page: Page, opts: { name: string; currency?: string }) {
  58  |   const { token, orgId } = await readAuthFromStorage(page);
> 59  |   expect(token, 'no access token in localStorage').toBeTruthy();
      |                                                    ^ Error: no access token in localStorage
  60  |   expect(orgId, 'no org id in persisted auth state').toBeTruthy();
  61  | 
  62  |   const apiUrl = process.env.PW_API_URL || 'http://127.0.0.1:9100';
  63  |   const api = await request.newContext({ baseURL: apiUrl });
  64  |   const resp = await api.post('/api/budget/budgets', {
  65  |     data: { org_id: orgId, name: opts.name, budget_type: 'invest', currency: opts.currency ?? 'VND' },
  66  |     headers: { Authorization: `Bearer ${token}` },
  67  |   });
  68  |   expect(resp.status(), `budget create failed: ${await resp.text()}`).toBeLessThan(300);
  69  |   const body = (await resp.json()) as { base?: { id?: string }; id?: string };
  70  |   const budgetId = body.base?.id ?? body.id;
  71  |   expect(budgetId, 'no budget id').toBeTruthy();
  72  |   await api.dispose();
  73  |   return { budgetId, token };
  74  | }
  75  | 
  76  | async function createInvestAssetViaApi(
  77  |   token: string,
  78  |   budgetId: string,
  79  |   payload: Record<string, unknown>,
  80  | ) {
  81  |   const apiUrl = process.env.PW_API_URL || 'http://127.0.0.1:9100';
  82  |   const api = await request.newContext({ baseURL: apiUrl });
  83  |   try {
  84  |     const resp = await api.post(`/api/budget/budgets/${budgetId}/invest/assets`, {
  85  |       data: payload,
  86  |       headers: { Authorization: `Bearer ${token}` },
  87  |     });
  88  |     // Capture status + body before disposing the context.
  89  |     const status = resp.status();
  90  |     const text = await resp.text();
  91  |     return { status, text, ok: status < 300 };
  92  |   } finally {
  93  |     await api.dispose();
  94  |   }
  95  | }
  96  | 
  97  | async function listInvestAssetsViaApi(token: string, budgetId: string) {
  98  |   const apiUrl = process.env.PW_API_URL || 'http://127.0.0.1:9100';
  99  |   const api = await request.newContext({ baseURL: apiUrl });
  100 |   try {
  101 |     const resp = await api.get(`/api/budget/budgets/${budgetId}/invest/assets`, {
  102 |       headers: { Authorization: `Bearer ${token}` },
  103 |     });
  104 |     const status = resp.status();
  105 |     const text = await resp.text();
  106 |     return { status, text, body: text ? JSON.parse(text) : null };
  107 |   } finally {
  108 |     await api.dispose();
  109 |   }
  110 | }
  111 | 
  112 | async function archiveAssetViaApi(token: string, budgetId: string, assetId: string) {
  113 |   const apiUrl = process.env.PW_API_URL || 'http://127.0.0.1:9100';
  114 |   const api = await request.newContext({ baseURL: apiUrl });
  115 |   try {
  116 |     const resp = await api.delete(`/api/budget/budgets/${budgetId}/invest/assets/${assetId}`, {
  117 |       headers: { Authorization: `Bearer ${token}` },
  118 |     });
  119 |     const status = resp.status();
  120 |     const text = await resp.text();
  121 |     return { status, text, ok: status < 300 };
  122 |   } finally {
  123 |     await api.dispose();
  124 |   }
  125 | }
  126 | 
  127 | test.describe('Invest budget full CRUD', () => {
  128 |   test('API CRUD: create + list + delete 3 asset classes for an invest budget', async ({ page }) => {
  129 |     await registerAndLogin(page, { displayName: 'E2E API CRUD' });
  130 |     await skipOrgSelection(page);
  131 | 
  132 |     const { budgetId, token } = await createInvestBudget(page, {
  133 |       name: `E2E API CRUD ${Date.now()}`,
  134 |     });
  135 | 
  136 |     // Create 3 assets via API.
  137 |     const savings = await createInvestAssetViaApi(token, budgetId, {
  138 |       asset_type: 'savings_deposit', name: 'E2E VCB Savings',
  139 |       principal: 50000000, annual_rate: 5.2, interest_type: 'simple',
  140 |       start_date: '2026-01-01', maturity_date: '2026-12-31', bank_name: 'VCB',
  141 |     });
  142 |     expect(savings.ok, `savings create failed: ${savings.text}`).toBe(true);
  143 | 
  144 |     const gold = await createInvestAssetViaApi(token, budgetId, {
  145 |       asset_type: 'gold', name: 'E2E SJC 9999',
  146 |       quantity: 2, unit: 'luong', cost_basis_per_unit: 84000000,
  147 |       purchase_date: '2026-02-01',
  148 |     });
  149 |     expect(gold.ok, `gold create failed: ${gold.text}`).toBe(true);
  150 | 
  151 |     const stock = await createInvestAssetViaApi(token, budgetId, {
  152 |       asset_type: 'stock', name: 'E2E VNM Holdings',
  153 |       ticker: 'VNM', exchange: 'HOSE',
  154 |       shares: 1000, avg_cost_per_share: 72500, purchase_date: '2026-03-01',
  155 |     });
  156 |     expect(stock.ok, `stock create failed: ${stock.text}`).toBe(true);
  157 | 
  158 |     // ----- READ: list via API (server-side persistence) -----
  159 |     // The UI render path after page.goto is flaky under the current
```