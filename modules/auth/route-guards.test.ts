import { describe, expect, it } from "vitest";

import { routes } from "@/constants/routes";
import { getAdminRedirect, getDashboardRedirect, getPostLoginTarget, getPublicAuthRedirect } from "@/modules/auth/route-guards";

describe("route guards", () => {
  it("sends super admins to admin after login", () => {
    const result = getPostLoginTarget({
      token: "token",
      userType: "super_admin",
      selectedOrgId: null
    });

    expect(result).toBe(routes.admin);
  });

  it("sends normal users without org to selection", () => {
    const result = getPostLoginTarget({
      token: "token",
      userType: "normal",
      selectedOrgId: null
    });

    expect(result).toBe(routes.selectOrganization);
  });

  it("keeps normal users with selected org on app root", () => {
    const result = getPublicAuthRedirect({
      token: "token",
      userType: "normal",
      selectedOrgId: "org-1"
    });

    expect(result).toBe(routes.root);
  });

  it("redirects unauthenticated dashboard users to login", () => {
    const result = getDashboardRedirect(
      {
        token: null,
        userType: null,
        selectedOrgId: null
      },
      "/en/app"
    );

    expect(result).toBe(routes.login);
  });

  it("allows select organization path without selected organization", () => {
    const result = getDashboardRedirect(
      {
        token: "token",
        userType: "normal",
        selectedOrgId: null
      },
      "/en/select-organization"
    );

    expect(result).toBeNull();
  });

  it("redirects non-admin users away from admin", () => {
    const result = getAdminRedirect({
      token: "token",
      userType: "normal",
      selectedOrgId: "org-1"
    });

    expect(result).toBe(routes.selectOrganization);
  });

  it("honors a sanitized returnTo for normal users", () => {
    const result = getPostLoginTarget(
      {
        token: "token",
        userType: "normal",
        selectedOrgId: "org-1"
      },
      { returnTo: "/en/sharing/abc" }
    );

    expect(result).toBe("/en/sharing/abc");
  });

  it("honors a sanitized returnTo even for super admins", () => {
    const result = getPublicAuthRedirect(
      {
        token: "token",
        userType: "super_admin",
        selectedOrgId: null
      },
      { returnTo: "/en/sharing/abc" }
    );

    expect(result).toBe("/en/sharing/abc");
  });

  it("ignores an unsafe returnTo and falls back to default behavior", () => {
    const result = getPostLoginTarget(
      {
        token: "token",
        userType: "normal",
        selectedOrgId: "org-1"
      },
      { returnTo: "https://evil.com/x" }
    );

    expect(result).toBe(routes.root);
  });
});
