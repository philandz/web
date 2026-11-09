import { describe, expect, it } from "vitest";
import {
  countActiveFilters,
  defaultDraft,
  isDefaultView,
  parseUrlParams,
  serializeToUrl,
  validateDraft,
} from "./transactions";

const today = new Date(2026, 10, 6, 9, 0);
const ctx = { periodStartDay: 25, today };

describe("countActiveFilters", () => {
  it("is 0 for the defaults", () => {
    expect(countActiveFilters(defaultDraft(ctx))).toBe(0);
  });

  it("ignores view settings: sort, direction, page, page size and the date range", () => {
    expect(
      countActiveFilters({
        ...defaultDraft(ctx),
        sortBy: "amount",
        sortDir: "asc",
        page: 4,
        pageSize: 100,
        range: "custom",
        dateFrom: "2026-11-01",
        dateTo: "2026-11-30",
      }),
    ).toBe(0);
  });

  it("counts search, type, categories, members and an amount range once each", () => {
    expect(
      countActiveFilters({
        ...defaultDraft(ctx),
        q: "coffee",
        type: "transfer",
        categoryIds: ["a", "b"],
        memberIds: ["u1"],
        amountMin: 1000,
        amountMax: 5000,
      }),
    ).toBe(5);
  });
});

describe("URL round trip", () => {
  const roundTrip = (sp: string) => {
    const parsed = parseUrlParams(new URLSearchParams(sp), ctx);
    const out = new URLSearchParams();
    serializeToUrl(parsed, out, ctx);
    return { parsed, url: out.toString() };
  };

  it("an empty URL is the budget's current period", () => {
    const { parsed, url } = roundTrip("");
    expect(parsed.range).toBe("period:0");
    expect(parsed.dateFrom).toBe("2026-10-25");
    expect(parsed.dateTo).toBe("2026-11-24");
    expect(url).toBe("");
  });

  it("keeps a relative range as a token, not as dates", () => {
    const { parsed, url } = roundTrip("range=period:-1");
    expect(parsed.dateFrom).toBe("2026-09-25");
    expect(parsed.dateTo).toBe("2026-10-24");
    expect(url).toBe("range=period%3A-1");
  });

  it("explicit from/to is a custom range and wins over a token", () => {
    const { parsed, url } = roundTrip("from=2026-11-01&to=2026-11-10&range=month:0");
    expect(parsed.range).toBe("custom");
    expect(url).toBe("from=2026-11-01&to=2026-11-10");
  });

  it("'all' means an open range", () => {
    const { parsed, url } = roundTrip("range=all");
    expect(parsed.dateFrom).toBe("");
    expect(parsed.dateTo).toBe("");
    expect(url).toBe("range=all");
  });

  it("round-trips every other field and drops defaults", () => {
    const sp =
      "q=coffee&type=expense&category_ids=a%2Cb&member_ids=u1&amount_min=1000&amount_max=9000&sort=amount&dir=asc&page=3&page_size=50";
    const { parsed, url } = roundTrip(sp);
    expect(parsed).toMatchObject({
      q: "coffee",
      type: "expense",
      categoryIds: ["a", "b"],
      memberIds: ["u1"],
      amountMin: 1000,
      amountMax: 9000,
      sortBy: "amount",
      sortDir: "asc",
      page: 3,
      pageSize: 50,
    });
    expect(new URLSearchParams(url).toString()).toBe(new URLSearchParams(sp).toString());
  });

  it("falls back to defaults for junk values", () => {
    const { parsed } = roundTrip("type=zzz&sort=zzz&page=-4&page_size=7&range=zzz&amount_min=abc");
    expect(parsed).toMatchObject({ type: "all", sortBy: "date", page: 1, pageSize: 30, range: "period:0" });
    expect(parsed.amountMin).toBeUndefined();
  });

  it("the all-budgets page defaults to the calendar month", () => {
    expect(defaultDraft({ today }).range).toBe("month:0");
  });
});

describe("validateDraft", () => {
  it("accepts a year and refuses more", () => {
    const d = defaultDraft(ctx);
    expect(validateDraft({ ...d, dateFrom: "2026-01-01", dateTo: "2027-01-02" }).ok).toBe(true);
    expect(validateDraft({ ...d, dateFrom: "2026-01-01", dateTo: "2027-01-03" }).errors.dateTo).toBe("tooWide");
    expect(validateDraft({ ...d, dateFrom: "2026-02-01", dateTo: "2026-01-01" }).errors.dateTo).toBe("order");
    expect(validateDraft({ ...d, amountMin: 9, amountMax: 3 }).errors.amountMax).toBe("amountOrder");
  });
});

describe("isDefaultView", () => {
  it("is false once the range moves", () => {
    const d = defaultDraft(ctx);
    expect(isDefaultView(d, ctx)).toBe(true);
    expect(isDefaultView({ ...d, dateFrom: "2026-01-01" }, ctx)).toBe(false);
    expect(isDefaultView({ ...d, q: "x" }, ctx)).toBe(false);
  });
});
