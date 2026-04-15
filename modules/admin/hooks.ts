import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminService, type ListParams } from "@/services/admin-service";

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export function useAdminUsersQuery(params: ListParams = {}) {
  return useQuery({
    queryKey: ["admin", "users", params],
    queryFn: () => adminService.listUsers(params),
    placeholderData: (prev) => prev,
  });
}

export function useCreateUserMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: adminService.createUser,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "users"] }),
  });
}

export function useUpdateUserMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, input }: { userId: string; input: Parameters<typeof adminService.updateUser>[1] }) =>
      adminService.updateUser(userId, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "users"] }),
  });
}

export function useDeleteUserMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: adminService.deleteUser,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "users"] }),
  });
}

// ---------------------------------------------------------------------------
// Organizations
// ---------------------------------------------------------------------------

export function useAdminOrgsQuery(params: ListParams = {}) {
  return useQuery({
    queryKey: ["admin", "orgs", params],
    queryFn: () => adminService.listOrgs(params),
    placeholderData: (prev) => prev,
  });
}

export function useCreateOrgMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: adminService.createOrg,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "orgs"] }),
  });
}

export function useUpdateOrgMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orgId, input }: { orgId: string; input: Parameters<typeof adminService.updateOrg>[1] }) =>
      adminService.updateOrg(orgId, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "orgs"] }),
  });
}

export function useDeleteOrgMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: adminService.deleteOrg,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "orgs"] }),
  });
}
