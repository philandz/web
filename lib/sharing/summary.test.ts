import { describe, expect, it } from "vitest";
import { buildSettlementSummary } from "./summary";

const labels = {
  header: 'Settlement for "Trip"',
  total: "Total spent: 900",
  nobody: "Everyone is settled.",
  line: (f: string, t: string, a: string) => `${f} pays ${t}: ${a}`,
};

describe("buildSettlementSummary", () => {
  it("lists each transfer", () => {
    const out = buildSettlementSummary(
      [{ from: "An", to: "Binh", amount: 300 }],
      labels,
      (n) => `${n}đ`,
    );
    expect(out).toBe('Settlement for "Trip"\nTotal spent: 900\n• An pays Binh: 300đ');
  });

  it("says everyone is settled when there are no transfers", () => {
    const out = buildSettlementSummary([], labels, String);
    expect(out.split("\n").at(-1)).toBe("Everyone is settled.");
  });
});
