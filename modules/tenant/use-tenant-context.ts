"use client";

import { useMemo } from "react";

import { useAuthStore } from "@/lib/auth-store";
import { getTenantPermissions } from "@/modules/tenant/permissions";

export function useTenantContext() {
  const userType = useAuthStore((state) => state.userType);
  const organizations = useAuthStore((state) => state.organizations);
  const selectedOrgId = useAuthStore((state) => state.selectedOrgId);

  const selectedOrganization = useMemo(() => {
    if (!organizations.length) return null;
    if (!selectedOrgId) return null;
    return organizations.find((org) => org.id === selectedOrgId) ?? null;
  }, [organizations, selectedOrgId]);

  const orgRole = selectedOrganization?.role ?? "none";
  const permissions = useMemo(() => getTenantPermissions(userType, orgRole), [orgRole, userType]);

  return {
    userType,
    organizations,
    selectedOrgId,
    selectedOrganization,
    orgRole,
    permissions,
    hasOrganizations: organizations.length > 0,
    isOrgSelected: Boolean(selectedOrganization)
  };
}
