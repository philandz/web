import { routes } from "@/constants/routes";
import type { AppUserType } from "@/lib/identity-normalize";
import { sanitizeReturnTo } from "@/modules/auth/return-to";

type SessionSnapshot = {
  token: string | null;
  userType: AppUserType | null;
  selectedOrgId: string | null;
};

type RedirectOptions = {
  returnTo?: string | null;
};

export function getPostLoginTarget(
  session: SessionSnapshot,
  options: RedirectOptions = {}
) {
  const returnTo = sanitizeReturnTo(options.returnTo);
  if (returnTo) return returnTo;

  if (!session.token || !session.userType) return null;
  if (session.userType === "super_admin") return routes.admin;
  if (!session.selectedOrgId) return routes.selectOrganization;
  return routes.root;
}

export function getPublicAuthRedirect(
  session: SessionSnapshot,
  options: RedirectOptions = {}
) {
  return getPostLoginTarget(session, options);
}

export function getDashboardRedirect(session: SessionSnapshot, pathname: string) {
  if (!session.token || !session.userType) return routes.login;
  if (session.userType === "super_admin") return routes.admin;

  const isSelectOrgPath = pathname === routes.selectOrganization || pathname.endsWith(routes.selectOrganization);
  if (!session.selectedOrgId && !isSelectOrgPath) return routes.selectOrganization;
  return null;
}

export function getAdminRedirect(session: SessionSnapshot) {
  if (!session.token || !session.userType) return routes.login;
  if (session.userType !== "super_admin") return routes.selectOrganization;
  return null;
}