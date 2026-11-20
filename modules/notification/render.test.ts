import { describe, expect, it } from "vitest";

import type { InboxItem } from "@/services/notification-service";

import { renderNotification, typeKey, type Translator } from "./render";

const MESSAGES: Record<string, string> = {
  "types.debt_payment_due.title": "Debt due in {days} days",
  "types.debt_payment_due.body": "{name}: {amount}",
  "types.sharing_expense_added.title": "New expense",
  "types.sharing_expense_added.grouped": "{count} new expenses",
  "types.broken.title": "Needs {missing}",
  "types.entry_comment_added.title": "{actor_name} commented on {entry_description}",
  "types.budget_member_added.title": "{actor_name} added you to {budget_name}",
  "types.budget_member_added.body": "Your role: {role_label}",
  fallbackTitle: "Notification",
  someone: "A member",
  aTransaction: "a transaction",
  "roles.contributor": "Contributor",
};

const t = Object.assign(
  (key: string, values: Record<string, string | number> = {}) => {
    const msg = MESSAGES[key];
    if (msg === undefined) throw new Error(`missing ${key}`);
    return msg.replace(/\{(\w+)\}/g, (_, k: string) => {
      if (!(k in values)) throw new Error(`no value for ${k}`);
      return String(values[k]);
    });
  },
  { has: (key: string) => key in MESSAGES }
) as Translator;

function item(over: Partial<InboxItem>): InboxItem {
  return {
    id: "1",
    kind: "personal",
    category: "reminder",
    severity: "info",
    type: "debt.payment_due",
    params: {},
    title: "",
    body: "",
    fallbackText: "fallback",
    link: "",
    budgetId: "",
    actorUserId: "",
    actorName: "",
    groupCount: 1,
    createdAt: 0,
    isRead: false,
    ...over,
  };
}

describe("typeKey", () => {
  it("replaces dots", () => expect(typeKey("debt.payment_due")).toBe("debt_payment_due"));
});

describe("renderNotification", () => {
  it("renders a known type from params", () => {
    expect(renderNotification(t, item({ params: { days: 3, name: "Bank", amount: "5M" } }))).toEqual({
      title: "Debt due in 3 days",
      body: "Bank: 5M",
    });
  });

  it("uses the grouped title when several events were collapsed", () => {
    expect(
      renderNotification(t, item({ type: "sharing.expense_added", groupCount: 4 })).title
    ).toBe("4 new expenses");
  });

  it("falls back for an unknown type", () => {
    expect(renderNotification(t, item({ type: "future.thing" })).title).toBe("fallback");
  });

  it("falls back when the message cannot be formatted", () => {
    expect(renderNotification(t, item({ type: "broken" })).title).toBe("fallback");
  });

  it("falls back to a generic title when there is no fallback text", () => {
    expect(renderNotification(t, item({ type: "future.thing", fallbackText: "" })).title).toBe("Notification");
  });

  it("returns broadcast text verbatim", () => {
    expect(
      renderNotification(t, item({ kind: "system", title: "Maintenance", body: "Tonight" }))
    ).toEqual({ title: "Maintenance", body: "Tonight" });
  });

  it("names the actor from the inbox lookup and the transaction from params", () => {
    expect(
      renderNotification(
        t,
        item({
          type: "entry.comment_added",
          actorName: "Bình",
          params: { entry_description: "Tiền điện", excerpt: "hi" },
        })
      ).title
    ).toBe("Bình commented on Tiền điện");
  });

  it("falls back to generic words when the actor or transaction is unknown", () => {
    expect(renderNotification(t, item({ type: "entry.comment_added" })).title).toBe(
      "A member commented on a transaction"
    );
  });

  it("translates the role", () => {
    expect(
      renderNotification(
        t,
        item({
          type: "budget.member_added",
          actorName: "Anh",
          params: { budget_name: "Home", role: "contributor" },
        })
      )
    ).toEqual({ title: "Anh added you to Home", body: "Your role: Contributor" });
  });
});
