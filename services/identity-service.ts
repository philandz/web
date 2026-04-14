import { normalizeOrgRole, normalizeUserType } from "@/lib/identity-normalize";
import { apiClient } from "@/lib/http/client";
import type { IdentityOrganization, IdentityProfile, LoginResult, RegisterResult, UpdateProfileInput } from "@/types/identity";

interface RawLoginResponse {
  access_token: string;
  user_type: string | number;
  organizations: Array<{
    id: string;
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
        id: org.id,
        name: org.name,
        role: normalizeOrgRole(org.role)
      }))
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

  async forgotPassword(input: { email: string }): Promise<void> {
    await apiClient.post<{ message?: string }>(`${BASE_PATH}/forgot`, input);
  },

  async resetPassword(input: { token: string; newPassword: string }): Promise<void> {
    await apiClient.post<{ message?: string }>(`${BASE_PATH}/reset`, {
      token: input.token,
      new_password: input.newPassword
    });
  }
};
