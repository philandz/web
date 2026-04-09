import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { LoginResult } from "@/types/identity";
import { ApiError, isForbiddenError, isUnauthorizedError } from "@/lib/http/errors";
import { identityService } from "@/services/identity-service";
import { useAuthStore } from "@/lib/auth-store";
import type { ProfileFormValues } from "@/modules/auth/forms";

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

function toUpdateProfileInput(values: ProfileFormValues) {
  return {
    displayName: values.displayName,
    avatar: values.avatar || undefined,
    bio: values.bio || undefined,
    timezone: values.timezone || undefined,
    locale: values.locale || undefined
  };
}

export function useLoginMutation() {
  const setSession = useAuthStore((state) => state.setSession);
  const setProfile = useAuthStore((state) => state.setProfile);

  return useMutation({
    mutationFn: identityService.login,
    onSuccess: async (result: LoginResult) => {
      setSession(result);
      const profile = await identityService.profile();
      setProfile(profile);
    }
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
    mutationFn: async (values: ProfileFormValues) => {
      if (!token) {
        throw new ApiError({
          message: "Authentication required",
          code: "AUTH_REQUIRED",
          status: 401
        });
      }
      return identityService.updateProfile(toUpdateProfileInput(values));
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
