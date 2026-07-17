import { normalizeOrgRole, normalizeUserType } from "@/lib/identity-normalize";
import { apiClient } from "@/lib/http/client";
import type { AcceptInvitationResult, IdentityOrganization, IdentityProfile, InvitationResult, LoginResult, OrgInvitation, OrgMember, RegisterResult, UpdateProfileInput } from "@/types/identity";
import type { AppOrgRole } from "@/lib/identity-normalize";

interface RawLoginResponse {
  access_token: string;
  user_type: string | number;
  organizations: Array<{
    id?: string;
    base?: { id?: string };
    name: string;
    role: string | number;
  }>;
}

interface RawProfileResponse {
  user: {
    base?: { id?: string };
    email: string;
    display_name: string;
    avatar?: string;
    bio?: string;
    timezone?: string;
    locale?: string;
    user_type: string | number;
  };
}

interface RawOrganizationsResponse {
  organizations: Array<{
    id?: string;
    base?: { id?: string };
    name: string;
    role?: string | number;
  }>;
}

const BASE_PATH = "/api/identity";

export const identityService = {
  async register(input: { email: string; password: string; displayName: string }): Promise<RegisterResult> {
    const raw = await apiClient.post<RawProfileResponse>(`${BASE_PATH}/register`, {
      email: input.email,
      password: input.password,
      display_name: input.displayName
    });

    return {
      id: raw.user.base?.id ?? "",
      email: raw.user.email,
      displayName: raw.user.display_name,
      userType: normalizeUserType(raw.user.user_type)
    };
  },

  async updateProfile(input: UpdateProfileInput): Promise<IdentityProfile> {
    const raw = await apiClient.patch<RawProfileResponse>(`${BASE_PATH}/profile`, {
      display_name: input.displayName,
      avatar: input.avatar,
      bio: input.bio,
      timezone: input.timezone,
      locale: input.locale
    });

    return {
      id: raw.user.base?.id ?? "",
      email: raw.user.email,
      displayName: raw.user.display_name,
      avatar: raw.user.avatar ?? "",
      bio: raw.user.bio ?? "",
      timezone: raw.user.timezone ?? "",
      locale: raw.user.locale ?? "",
      userType: normalizeUserType(raw.user.user_type)
    };
  },

  async login(input: { email: string; password: string }): Promise<LoginResult> {
    const raw = await apiClient.post<RawLoginResponse>(`${BASE_PATH}/login`, input);

    return {
      token: raw.access_token,
      userType: normalizeUserType(raw.user_type),
      organizations: raw.organizations.map((org) => ({
        id: org.base?.id ?? org.id ?? "",
        name: org.name,
        role: normalizeOrgRole(org.role)
      }))
    };
  },

  async loginWithGoogle(idToken: string): Promise<LoginResult> {
    const raw = await apiClient.post<RawLoginResponse>(`${BASE_PATH}/login/google`, {
      id_token: idToken,
    });
    return {
      token: raw.access_token,
      userType: normalizeUserType(raw.user_type),
      organizations: raw.organizations.map((org) => ({
        id: org.base?.id ?? org.id ?? "",
        name: org.name,
        role: normalizeOrgRole(org.role),
      })),
    };
  },

  async profile(): Promise<IdentityProfile> {
    const raw = await apiClient.get<RawProfileResponse>(`${BASE_PATH}/profile`);

    return {
      id: raw.user.base?.id ?? "",
      email: raw.user.email,
      displayName: raw.user.display_name,
      avatar: raw.user.avatar ?? "",
      bio: raw.user.bio ?? "",
      timezone: raw.user.timezone ?? "",
      locale: raw.user.locale ?? "",
      userType: normalizeUserType(raw.user.user_type)
    };
  },

  async organizations(): Promise<IdentityOrganization[]> {
    const raw = await apiClient.get<RawOrganizationsResponse>(`${BASE_PATH}/organizations`);

    return raw.organizations
      .map((org) => ({
        id: org.base?.id ?? org.id ?? "",
        name: org.name,
        role: normalizeOrgRole(org.role)
      }))
      .filter((org) => org.id);
  },

  async orgMembers(orgId: string): Promise<OrgMember[]> {
    const raw = await apiClient.get<{
      members: Array<{
        user_id: string;
        email: string;
        display_name: string;
        avatar: string | null;
        role: string | number;
        status: string;
        joined_at: number;
      }>;
    }>(`${BASE_PATH}/organizations/${orgId}/members`);

    return raw.members.map((m) => ({
      userId: m.user_id,
      email: m.email,
      displayName: m.display_name,
      avatar: m.avatar ?? null,
      role: normalizeOrgRole(m.role),
      status: m.status === "invited" ? "invited" : "active",
      joinedAt: m.joined_at,
    }));
  },

  async inviteMember(orgId: string, input: { inviteeEmail: string; orgRole: AppOrgRole }): Promise<InvitationResult> {
    const raw = await apiClient.post<{
      invitation: {
        id?: string;
        base?: { id?: string };
        invitee_email: string;
        org_role: string | number;
        status: string | number;
        expires_at: number;
      } | null;
      invite_token: string;
    }>(`${BASE_PATH}/organizations/${orgId}/invitations`, {
      invitee_email: input.inviteeEmail,
      org_role: input.orgRole
    });

    return {
      invitationId: raw.invitation?.base?.id ?? raw.invitation?.id ?? "",
      inviteeEmail: raw.invitation?.invitee_email ?? "",
      orgRole: normalizeOrgRole(raw.invitation?.org_role ?? "member"),
      status: String(raw.invitation?.status ?? "pending"),
      expiresAt: raw.invitation?.expires_at ?? 0,
      inviteToken: raw.invite_token
    };
  },

  async updateMemberRole(orgId: string, userId: string, orgRole: AppOrgRole): Promise<void> {
    await apiClient.patch<{ message?: string }>(
      `${BASE_PATH}/organizations/${orgId}/members/${userId}/role`,
      { org_role: orgRole }
    );
  },

  async removeMember(orgId: string, userId: string): Promise<void> {
    await apiClient.request<{ message?: string }>(
      `${BASE_PATH}/organizations/${orgId}/members/${userId}`,
      { method: "DELETE" }
    );
  },

  async transferOwnership(orgId: string, newOwnerUserId: string): Promise<void> {
    await apiClient.post<{ message?: string }>(
      `${BASE_PATH}/organizations/${orgId}/transfer-ownership`,
      { new_owner_user_id: newOwnerUserId }
    );
  },

  async renameOrganization(orgId: string, name: string): Promise<void> {
    await apiClient.patch<{ message?: string }>(
      `${BASE_PATH}/organizations/${orgId}/name`,
      { name }
    );
  },

  async listOrgInvitations(orgId: string): Promise<OrgInvitation[]> {
    const raw = await apiClient.get<{
      invitations: Array<{
        id?: string;
        base?: { id?: string };
        invitee_email: string;
        org_role: string | number;
        expires_at: number;
        created_at: number;
      }>;
    }>(`${BASE_PATH}/organizations/${orgId}/invitations`);

    return raw.invitations.map((inv) => ({
      id: inv.base?.id ?? inv.id ?? "",
      inviteeEmail: inv.invitee_email,
      orgRole: normalizeOrgRole(inv.org_role),
      expiresAt: inv.expires_at,
      createdAt: inv.created_at
    }));
  },

  async revokeInvitation(orgId: string, invitationId: string): Promise<void> {
    await apiClient.request<{ message?: string }>(
      `${BASE_PATH}/organizations/${orgId}/invitations/${invitationId}`,
      { method: "DELETE" }
    );
  },

  async acceptInvitation(token: string): Promise<AcceptInvitationResult> {
    const raw = await apiClient.post<{ org_id: string; role: string | number }>(
      `${BASE_PATH}/invitations/${token}/accept`
    );
    return { orgId: raw.org_id, role: normalizeOrgRole(raw.role) };
  },

  async forgotPassword(input: { email: string }): Promise<void> {
    await apiClient.post<{ message?: string }>(`${BASE_PATH}/forgot`, input);
  },

  async resetPassword(input: { token: string; newPassword: string }): Promise<void> {
    await apiClient.post<{ message?: string }>(`${BASE_PATH}/reset`, {
      token: input.token,
      new_password: input.newPassword
    });
  },

  async logout(): Promise<void> {
    await apiClient.post<{ message?: string }>(`${BASE_PATH}/logout`, {});
  },

  async refreshToken(): Promise<{ accessToken: string }> {
    const raw = await apiClient.post<{ access_token: string }>(`${BASE_PATH}/refresh`, {});
    return { accessToken: raw.access_token };
  },

  async changePassword(input: { currentPassword: string; newPassword: string }): Promise<void> {
    await apiClient.post<{ message?: string }>(`${BASE_PATH}/update`, {
      current_password: input.currentPassword,
      new_password: input.newPassword,
    });
  },

  /**
   * Step 1 of the in-app password change — verify the current password,
   * email a 6-digit OTP, and return the TTL so the UI can show a countdown.
   */
  async requestPasswordChangeOtp(input: {
    currentPassword: string;
    newPassword: string;
  }): Promise<{ message: string; ttlSeconds: number }> {
    const raw = await apiClient.post<{ message?: string; ttl_seconds?: number }>(
      `${BASE_PATH}/password/request-otp`,
      {
        current_password: input.currentPassword,
        new_password: input.newPassword
      }
    );
    return {
      message: raw.message ?? "",
      ttlSeconds: raw.ttl_seconds ?? 600
    };
  },

  /**
   * Step 2 of the in-app password change — submit the OTP and apply the new
   * password on success.
   */
  async confirmPasswordChangeOtp(input: { otp: string; newPassword: string }): Promise<void> {
    await apiClient.post<{ message?: string }>(`${BASE_PATH}/password/confirm-otp`, {
      otp: input.otp,
      new_password: input.newPassword
    });
  }
};
