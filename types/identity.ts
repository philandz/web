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

export interface OrgMember {
  userId: string;
  email: string;
  displayName: string;
  role: AppOrgRole;
  status: "active" | "invited";
  joinedAt: number;
}

export interface InvitationResult {
  invitationId: string;
  inviteeEmail: string;
  orgRole: AppOrgRole;
  status: string;
  expiresAt: number;
  inviteToken: string;
}

export interface AcceptInvitationResult {
  orgId: string;
  role: AppOrgRole;
}

export interface OrgInvitation {
  id: string;
  inviteeEmail: string;
  orgRole: AppOrgRole;
  expiresAt: number;
  createdAt: number;
}
