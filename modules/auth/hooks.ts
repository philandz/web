import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { LoginResult } from "@/types/identity";
import { ApiError, isForbiddenError, isUnauthorizedError } from "@/lib/http/errors";
import { identityService } from "@/services/identity-service";
import { mediaService } from "@/services/media-service";
import { useAuthStore } from "@/lib/auth-store";
import type { ProfileFormValues } from "@/modules/auth/forms";
import { getPostLoginTarget } from "@/modules/auth/route-guards";
import { useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";

type AuthErrorHandler = {
  onUnauthorized: () => void;
  onForbidden?: () => void;
};

function handleAuthError(error: unknown, handlers: AuthErrorHandler) {
  if (isUnauthorizedError(error)) {
    handlers.onUnauthorized();
    return;
  }

  if (handlers.onForbidden && isForbiddenError(error)) {
    handlers.onForbidden();
  }
}

type UpdateProfilePayload = {
  values: ProfileFormValues;
  avatarFile?: File | null;
};

function toUpdateProfileInput(values: ProfileFormValues, avatarUrl?: string) {
  return {
    displayName: values.displayName,
    avatar: avatarUrl || undefined,
    bio: values.bio || undefined,
    timezone: values.timezone || undefined,
    locale: values.locale || undefined
  };
}

export function useLoginMutation() {
  const setSession = useAuthStore((state) => state.setSession);
  const setProfile = useAuthStore((state) => state.setProfile);
  const router = useRouter();
  const searchParams = useSearchParams();

  return useMutation({
    mutationFn: identityService.login,
    onSuccess: async (result: LoginResult) => {
      setSession(result);
      const profile = await identityService.profile();
      setProfile(profile);
      const target = getPostLoginTarget(
        { token: result.token, userType: result.userType, selectedOrgId: result.organizations?.[0]?.id ?? null },
        {
          returnTo: searchParams?.get("return_to") ?? null,
        }
      );
      if (target) router.push(target);
    },
  });
}

export function useLoginWithGoogleMutation() {
  const setSession = useAuthStore((state) => state.setSession);
  const setProfile = useAuthStore((state) => state.setProfile);
  const router = useRouter();
  const searchParams = useSearchParams();

  return useMutation({
    mutationFn: (idToken: string) => identityService.loginWithGoogle(idToken),
    onSuccess: async (result: LoginResult) => {
      setSession(result);
      const profile = await identityService.profile();
      setProfile(profile);
      const target = getPostLoginTarget(
        { token: result.token, userType: result.userType, selectedOrgId: result.organizations?.[0]?.id ?? null },
        {
          returnTo: searchParams?.get("return_to") ?? null,
        }
      );
      if (target) router.push(target);
    },
  });
}

export function useSignupMutation() {
  return useMutation({
    mutationFn: identityService.register
  });
}

export function useForgotPasswordMutation() {
  return useMutation({
    mutationFn: identityService.forgotPassword
  });
}

export function useResetPasswordMutation() {
  return useMutation({
    mutationFn: identityService.resetPassword
  });
}

export function useLogoutMutation() {
  const clearAuth = useAuthStore((state) => state.clearAuth);

  return useMutation({
    mutationFn: identityService.logout,
    onSuccess: () => {
      clearAuth();
    },
    onError: () => {
      clearAuth();
    },
  });
}

export function useChangePasswordMutation(onUnauthorized: () => void) {
  return useMutation({
    mutationFn: identityService.changePassword,
    onError: (error: unknown) => {
      handleAuthError(error, { onUnauthorized });
    },
  });
}

/**
 * Step 1 of the mandatory-OTP password change. Returns the TTL (seconds) so
 * the UI can show a countdown; the OTP itself is delivered by email.
 */
export function useRequestPasswordChangeOtpMutation(onUnauthorized: () => void) {
  return useMutation({
    mutationFn: identityService.requestPasswordChangeOtp,
    onError: (error: unknown) => {
      handleAuthError(error, { onUnauthorized });
    },
  });
}

/**
 * Step 2 of the mandatory-OTP password change. Submits the 6-digit code and,
 * on success, applies the new password server-side.
 */
export function useConfirmPasswordChangeOtpMutation(onUnauthorized: () => void) {
  return useMutation({
    mutationFn: identityService.confirmPasswordChangeOtp,
    onError: (error: unknown) => {
      handleAuthError(error, { onUnauthorized });
    },
  });
}

export function useOrganizationsQuery() {
  const token = useAuthStore((state) => state.token);
  const organizations = useAuthStore((state) => state.organizations);
  const setOrganizations = useAuthStore((state) => state.setOrganizations);

  const query = useQuery({
    queryKey: ["identity", "organizations", token],
    queryFn: async () => {
      if (!token) return [];
      return identityService.organizations();
    },
    enabled: Boolean(token)
  });

  useEffect(() => {
    if (query.data) {
      setOrganizations(query.data);
    }
  }, [query.data, setOrganizations]);

  const queryOrganizations = query.data ?? [];
  const hasUsableQueryOrganizations = queryOrganizations.some((org) => Boolean(org.id));

  return {
    ...query,
    organizations: hasUsableQueryOrganizations ? queryOrganizations : organizations
  };
}

export function useProfileQuery(onUnauthorized: () => void) {
  const token = useAuthStore((state) => state.token);
  const setProfile = useAuthStore((state) => state.setProfile);

  const query = useQuery({
    queryKey: ["identity", "profile", token],
    queryFn: async () => {
      if (!token) return null;
      return identityService.profile();
    },
    enabled: Boolean(token),
    retry: false
  });

  useEffect(() => {
    if (query.data) {
      setProfile(query.data);
    }
  }, [query.data, setProfile]);

  useEffect(() => {
    if (query.error) {
      handleAuthError(query.error, { onUnauthorized });
    }
  }, [query.error, onUnauthorized]);

  return query;
}

export function useUpdateProfileMutation(onUnauthorized: () => void) {
  const token = useAuthStore((state) => state.token);
  const setProfile = useAuthStore((state) => state.setProfile);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ values, avatarFile }: UpdateProfilePayload) => {
      if (!token) {
        throw new ApiError({
          message: "Authentication required",
          code: "AUTH_REQUIRED",
          status: 401
        });
      }
      const avatarUrl = avatarFile ? (await mediaService.uploadImage(avatarFile)).url : undefined;
      return identityService.updateProfile(toUpdateProfileInput(values, avatarUrl));
    },
    onSuccess: (updated) => {
      setProfile(updated);
      queryClient.setQueryData(["identity", "profile", token], updated);
    },
    onError: (error: unknown) => {
      handleAuthError(error, { onUnauthorized });
    }
  });
}
