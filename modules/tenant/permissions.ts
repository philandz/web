import type { AppOrgRole, AppUserType } from "@/lib/identity-normalize";

export interface TenantPermissions {
  canManageOrganization: boolean;
  canManageMembers: boolean;
  canSwitchOrganization: boolean;
  canAccessSuperAdmin: boolean;
}

export function getTenantPermissions(userType: AppUserType | null, orgRole: AppOrgRole): TenantPermissions {
  if (userType === "super_admin") {
    return {
      canManageOrganization: true,
      canManageMembers: true,
      canSwitchOrganization: true,
      canAccessSuperAdmin: true
    };
  }

  const canManage = orgRole === "owner" || orgRole === "admin";

  return {
    canManageOrganization: canManage,
    canManageMembers: canManage,
    canSwitchOrganization: true,
    canAccessSuperAdmin: false
  };
}
