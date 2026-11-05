import { describe, expect, it } from "vitest";
import { normalizeEnumLabel, type EnumLabelSpec } from "./enum-label";

type Type = "standard" | "saving" | "debt" | "invest" | "sharing";
type Role = "owner" | "manager" | "contributor" | "viewer";

const TYPE_SPEC: EnumLabelSpec<Type> = {
  numeric: { 1: "standard", 2: "saving", 3: "debt", 4: "invest", 5: "sharing" },
  labels: ["standard", "saving", "debt", "invest", "sharing"],
  fallback: "standard",
};

const ROLE_SPEC: EnumLabelSpec<Role> = {
  numeric: { 1: "owner", 2: "manager", 3: "contributor", 4: "viewer" },
  labels: ["owner", "manager", "contributor", "viewer"],
  fallback: "viewer",
};

describe("normalizeEnumLabel", () => {
  it("maps numeric codes", () => {
    expect(normalizeEnumLabel(1, TYPE_SPEC)).toBe("standard");
    expect(normalizeEnumLabel(5, TYPE_SPEC)).toBe("sharing");
    expect(normalizeEnumLabel(2, ROLE_SPEC)).toBe("manager");
    expect(normalizeEnumLabel(4, ROLE_SPEC)).toBe("viewer");
  });

  it("falls back for unknown numeric codes", () => {
    expect(normalizeEnumLabel(0, TYPE_SPEC)).toBe("standard");
    expect(normalizeEnumLabel(99, TYPE_SPEC)).toBe("standard");
    expect(normalizeEnumLabel(0, ROLE_SPEC)).toBe("viewer");
  });

  it("keeps canonical lowercase labels", () => {
    expect(normalizeEnumLabel("standard", TYPE_SPEC)).toBe("standard");
    expect(normalizeEnumLabel("saving", TYPE_SPEC)).toBe("saving");
    expect(normalizeEnumLabel("owner", ROLE_SPEC)).toBe("owner");
    expect(normalizeEnumLabel("contributor", ROLE_SPEC)).toBe("contributor");
  });

  it("accepts Rust variant names", () => {
    expect(normalizeEnumLabel("Standard", TYPE_SPEC)).toBe("standard");
    expect(normalizeEnumLabel("Saving", TYPE_SPEC)).toBe("saving");
    expect(normalizeEnumLabel("Debt", TYPE_SPEC)).toBe("debt");
    expect(normalizeEnumLabel("Invest", TYPE_SPEC)).toBe("invest");
    expect(normalizeEnumLabel("Sharing", TYPE_SPEC)).toBe("sharing");
    expect(normalizeEnumLabel("Owner", ROLE_SPEC)).toBe("owner");
    expect(normalizeEnumLabel("Manager", ROLE_SPEC)).toBe("manager");
    expect(normalizeEnumLabel("Contributor", ROLE_SPEC)).toBe("contributor");
    expect(normalizeEnumLabel("Viewer", ROLE_SPEC)).toBe("viewer");
  });

  it("accepts protobuf enum names", () => {
    expect(normalizeEnumLabel("BUDGET_TYPE_STANDARD", TYPE_SPEC)).toBe("standard");
    expect(normalizeEnumLabel("BUDGET_TYPE_SAVING", TYPE_SPEC)).toBe("saving");
    expect(normalizeEnumLabel("BUDGET_TYPE_DEBT", TYPE_SPEC)).toBe("debt");
    expect(normalizeEnumLabel("BUDGET_TYPE_INVEST", TYPE_SPEC)).toBe("invest");
    expect(normalizeEnumLabel("BUDGET_TYPE_SHARING", TYPE_SPEC)).toBe("sharing");
    expect(normalizeEnumLabel("BUDGET_ROLE_OWNER", ROLE_SPEC)).toBe("owner");
    expect(normalizeEnumLabel("BUDGET_ROLE_MANAGER", ROLE_SPEC)).toBe("manager");
    expect(normalizeEnumLabel("BUDGET_ROLE_CONTRIBUTOR", ROLE_SPEC)).toBe("contributor");
    expect(normalizeEnumLabel("BUDGET_ROLE_VIEWER", ROLE_SPEC)).toBe("viewer");
  });

  it("is case-insensitive", () => {
    expect(normalizeEnumLabel("STANDARD", TYPE_SPEC)).toBe("standard");
    expect(normalizeEnumLabel("sAvInG", TYPE_SPEC)).toBe("saving");
    expect(normalizeEnumLabel("budget_type_saving", TYPE_SPEC)).toBe("saving");
    expect(normalizeEnumLabel("BuDgEt_RoLe_Owner", ROLE_SPEC)).toBe("owner");
  });

  it("tolerates surrounding whitespace", () => {
    expect(normalizeEnumLabel("  saving  ", TYPE_SPEC)).toBe("saving");
    expect(normalizeEnumLabel(" manager ", ROLE_SPEC)).toBe("manager");
  });

  it("maps numeric codes sent as strings", () => {
    expect(normalizeEnumLabel("2", TYPE_SPEC)).toBe("saving");
    expect(normalizeEnumLabel("3", ROLE_SPEC)).toBe("contributor");
  });

  it("falls back for unknown values", () => {
    expect(normalizeEnumLabel("unknown", TYPE_SPEC)).toBe("standard");
    expect(normalizeEnumLabel("BUDGET_TYPE_NONSENSE", TYPE_SPEC)).toBe("standard");
    expect(normalizeEnumLabel("", TYPE_SPEC)).toBe("standard");
    expect(normalizeEnumLabel("   ", TYPE_SPEC)).toBe("standard");
    expect(normalizeEnumLabel(undefined, TYPE_SPEC)).toBe("standard");
    expect(normalizeEnumLabel(null, TYPE_SPEC)).toBe("standard");
    expect(normalizeEnumLabel("nonsense", ROLE_SPEC)).toBe("viewer");
    expect(normalizeEnumLabel("BUDGET_ROLE_NONSENSE", ROLE_SPEC)).toBe("viewer");
  });
});
