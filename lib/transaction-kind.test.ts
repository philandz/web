import { describe, expect, it } from "vitest";
import { toKind } from "@/services/transaction-service";
import { amountSign, isInflow, isTransferKind } from "./transaction-kind";

describe("transaction kinds", () => {
  it("maps numeric kinds including transfers", () => {
    expect([1, 2, 3, 4].map(toKind)).toEqual(["expense", "income", "transfer_out", "transfer_in"]);
    expect(toKind(99)).toBe("expense");
  });
  it("derives direction and sign", () => {
    expect(isInflow("income")).toBe(true);
    expect(isInflow("transfer_in")).toBe(true);
    expect(isInflow("transfer_out")).toBe(false);
    expect(amountSign("transfer_out")).toBe("−");
    expect(isTransferKind("expense")).toBe(false);
  });
});
