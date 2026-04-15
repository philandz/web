import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuthStore } from "@/lib/auth-store";
import type { AppOrgRole } from "@/lib/identity-normalize";
import { identityService } from "@/services/identity-service";

export function useOrgMembersQuery(orgId: string | null) {
  const token = useAuthStore((state) => state.token);

  return useQuery({
    queryKey: ["identity", "org-members", orgId, token],
    queryFn: async () => {
      if (!orgId || !token) return [];
      return identityService.orgMembers(orgId);
    },
    enabled: Boolean(orgId && token)
  });
}

export function useInviteMemberMutation(orgId: string) {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);

  return useMutation({
    mutationFn: (input: { inviteeEmail: string; orgRole: AppOrgRole }) =>
      identityService.inviteMember(orgId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["identity", "org-members", orgId, token] });
    }
  });
}

export function useUpdateMemberRoleMutation(orgId: string) {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);

  return useMutation({
    mutationFn: ({ userId, orgRole }: { userId: string; orgRole: AppOrgRole }) =>
      identityService.updateMemberRole(orgId, userId, orgRole),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["identity", "org-members", orgId, token] });
    }
  });
}

export function useRemoveMemberMutation(orgId: string) {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);

  return useMutation({
    mutationFn: (userId: string) => identityService.removeMember(orgId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["identity", "org-members", orgId, token] });
    }
  });
}

export function useTransferOwnershipMutation(orgId: string) {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);
  const organizations = useAuthStore((state) => state.organizations);
  const setOrganizations = useAuthStore((state) => state.setOrganizations);

  return useMutation({
    mutationFn: (newOwnerUserId: string) =>
      identityService.transferOwnership(orgId, newOwnerUserId),
    onSuccess: () => {
      // Caller's role in auth store drops from owner → admin.
      setOrganizations(
        organizations.map((org) =>
          org.id === orgId ? { ...org, role: "admin" as const } : org
        )
      );
      queryClient.invalidateQueries({ queryKey: ["identity", "org-members", orgId, token] });
    }
  });
}

export function useRenameOrganizationMutation(orgId: string) {
  const queryClient = useQueryClient();
  const setOrganizations = useAuthStore((state) => state.setOrganizations);
  const organizations = useAuthStore((state) => state.organizations);

  return useMutation({
    mutationFn: (name: string) => identityService.renameOrganization(orgId, name),
    onSuccess: (_data, name) => {
      // Update the org name in the auth store without a full session refresh.
      setOrganizations(
        organizations.map((org) => (org.id === orgId ? { ...org, name } : org))
      );
      queryClient.invalidateQueries({ queryKey: ["identity", "org-members", orgId] });
    }
  });
}

export function useOrgInvitationsQuery(orgId: string | null) {
  const token = useAuthStore((state) => state.token);

  return useQuery({
    queryKey: ["identity", "org-invitations", orgId, token],
    queryFn: async () => {
      if (!orgId || !token) return [];
      return identityService.listOrgInvitations(orgId);
    },
    enabled: Boolean(orgId && token)
  });
}

export function useRevokeInvitationMutation(orgId: string) {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);

  return useMutation({
    mutationFn: (invitationId: string) => identityService.revokeInvitation(orgId, invitationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["identity", "org-invitations", orgId, token] });
    }
  });
}

export function useLeaveOrgMutation(orgId: string) {
  const leaveOrganization = useAuthStore((state) => state.leaveOrganization);

  return useMutation({
    mutationFn: (userId: string) => identityService.removeMember(orgId, userId),
    onSuccess: () => {
      leaveOrganization(orgId);
    }
  });
}
