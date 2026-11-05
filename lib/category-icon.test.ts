import { describe, expect, it } from "vitest";
import { categoryIcon, sameCategoryName } from "./category-icon";

describe("categoryIcon", () => {
  it("keeps emoji", () => expect(categoryIcon("🍔", "Ăn uống")).toBe("🍔"));
  it("falls back to the initial for icon keys", () => {
    expect(categoryIcon("tag", "ăn uống")).toBe("Ă");
    expect(categoryIcon("", "Lương")).toBe("L");
  });
});
describe("sameCategoryName", () => {
  it("ignores case and accents", () => {
    expect(sameCategoryName("Ăn uống", "an UONG ")).toBe(true);
    expect(sameCategoryName("Nhà ở", "Nhà cửa")).toBe(false);
  });
});
