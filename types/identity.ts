import type { AppOrgRole, AppUserType } from "@/lib/identity-normalize";

export interface IdentityOrganization {
  id: string;
  name: string;
  role: AppOrgRole;
}

export interface IdentityProfile {
  id: string;
  email: string;
  displayName: string;
  avatar?: string;
  bio?: string;
  timezone?: string;
  locale?: string;
  userType: AppUserType;
}

export interface UpdateProfileInput {
  displayName?: string;
  avatar?: string;
  bio?: string;
  timezone?: string;
  locale?: string;
}

export interface LoginResult {
  token: string;
  userType: AppUserType;
  organizations: IdentityOrganization[];
}

export interface RegisterResult {
  id: string;
  email: string;
  displayName: string;
  userType: AppUserType;
}
