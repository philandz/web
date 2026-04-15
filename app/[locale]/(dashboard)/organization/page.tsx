"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  AlertTriangle,
  ArrowRightLeft,
  Building2,
  Check,
  ChevronDown,
  Copy,
  LogOut,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  UserCog2,
  X,
} from "lucide-react";

import { SectionLoadingState } from "@/components/state/section-loading-state";
import { useToast } from "@/components/state/toast-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectNative } from "@/components/ui/select";
import { UserAvatar } from "@/components/ui/user-avatar";
import { useAuthStore } from "@/lib/auth-store";
import type { AppOrgRole } from "@/lib/identity-normalize";
import { cn } from "@/lib/utils";
import {
  useInviteMemberMutation,
  useLeaveOrgMutation,
  useOrgInvitationsQuery,
  useOrgMembersQuery,
  useRemoveMemberMutation,
  useRenameOrganizationMutation,
  useRevokeInvitationMutation,
  useTransferOwnershipMutation,
  useUpdateMemberRoleMutation,
} from "@/modules/tenant/hooks";
import { useTenantContext } from "@/modules/tenant/use-tenant-context";
import { useRouter } from "@/i18n/navigation";
import { routes } from "@/constants/routes";
import type { OrgInvitation, OrgMember } from "@/types/identity";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function roleLabel(role: AppOrgRole, t: (k: string) => string) {
  if (role === "owner") return t("roleOwner");
  if (role === "admin") return t("roleAdmin");
  return t("roleMember");
}

function roleBadgeClass(role: AppOrgRole) {
  if (role === "owner") return "border-amber-200 bg-amber-500/10 text-amber-600 dark:border-amber-800 dark:text-amber-400";
  if (role === "admin") return "border-blue-200 bg-blue-500/10 text-blue-600 dark:border-blue-800 dark:text-blue-400";
  return "";
}

// ---------------------------------------------------------------------------
// Bead 2 — Role permissions matrix
// ---------------------------------------------------------------------------

function RolesMatrix() {
  const t = useTranslations("dashboard.organization");
  const [open, setOpen] = useState(false);

  type Cell = "yes" | "no" | "partial";

  const rows: Array<{ label: string; owner: Cell; admin: Cell; member: Cell }> = [
    { label: t("rolesInvite"),     owner: "yes", admin: "yes",     member: "no" },
    { label: t("rolesRemove"),     owner: "yes", admin: "partial", member: "no" },
    { label: t("rolesChangeRole"), owner: "yes", admin: "no",      member: "no" },
    { label: t("rolesRenameOrg"),  owner: "yes", admin: "no",      member: "no" },
  ];

  function CellValue({ value, label }: { value: Cell; label: string }) {
    if (value === "yes") {
      return (
        <span className="inline-flex items-center justify-center">
          <Check className="h-3.5 w-3.5 text-emerald-500" />
        </span>
      );
    }
    if (value === "partial") {
      return (
        <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400">
          {label}
        </span>
      );
    }
    return <span className="text-muted-foreground/50">—</span>;
  }

  return (
    <div className="surface-panel overflow-hidden rounded-2xl">
      <button
        onClick={() => setOpen((p) => !p)}
        className="flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-muted/40 md:px-6"
      >
        <span className="text-sm font-medium text-foreground">{t("rolesTitle")}</span>
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {open ? t("rolesToggleClose") : t("rolesToggleOpen")}
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 shrink-0 transition-transform duration-200",
              open && "rotate-180"
            )}
          />
        </span>
      </button>

      {open ? (
        <div className="border-t border-border/60 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/40 text-left">
                <th className="px-5 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground md:px-6">
                  {t("rolesColAction")}
                </th>
                <th className="px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("rolesColOwner")}
                </th>
                <th className="px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("rolesColAdmin")}
                </th>
                <th className="px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("rolesColMember")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {rows.map((row) => (
                <tr key={row.label} className="text-sm text-foreground">
                  <td className="px-5 py-2.5 text-muted-foreground md:px-6">{row.label}</td>
                  <td className="px-4 py-2.5 text-center">
                    <CellValue value={row.owner} label={t("rolesPartial")} />
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <CellValue value={row.admin} label={t("rolesPartial")} />
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <CellValue value={row.member} label={t("rolesPartial")} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Invite dialog (with invite link display after success)
// ---------------------------------------------------------------------------

function InviteDialog({ orgId, onClose }: { orgId: string; onClose: () => void }) {
  const t = useTranslations("dashboard.organization");
  const toast = useToast();
  const mutation = useInviteMemberMutation(orgId);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AppOrgRole>("member");
  const [inviteLink, setInviteLink] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    mutation.mutate(
      { inviteeEmail: email, orgRole: role },
      {
        onSuccess: (data) => {
          setInviteLink(`${window.location.origin}/accept-invitation?token=${data.inviteToken}`);
          toast.success(t("inviteSuccess"));
        },
        onError: () => toast.error(t("inviteError"))
      }
    );
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("inviteTitle")}</DialogTitle>
        </DialogHeader>
        {inviteLink ? (
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">{t("inviteLinkHint")}</p>
            <div className="flex items-center gap-2 rounded-xl bg-muted px-3 py-2">
              <span className="min-w-0 flex-1 truncate font-mono text-xs text-foreground">{inviteLink}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 w-7 shrink-0 p-0"
                onClick={() => navigator.clipboard.writeText(inviteLink)}
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>
            <DialogFooter>
              <Button type="button" onClick={onClose}>{t("close")}</Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>{t("inviteEmail")}</Label>
              <Input
                type="email"
                required
                placeholder={t("inviteEmailPlaceholder")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("inviteRole")}</Label>
              <SelectNative value={role} onValueChange={(v) => setRole(v as AppOrgRole)}>
                <option value="admin">{t("roleAdmin")}</option>
                <option value="member">{t("roleMember")}</option>
              </SelectNative>
            </div>
            {mutation.isError ? (
              <p className="text-xs text-destructive">{String(mutation.error)}</p>
            ) : null}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                {t("cancel")}
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? t("inviting") : t("inviteSend")}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Change role dialog
// ---------------------------------------------------------------------------

function ChangeRoleDialog({ member, orgId, onClose }: { member: OrgMember; orgId: string; onClose: () => void }) {
  const t = useTranslations("dashboard.organization");
  const toast = useToast();
  const mutation = useUpdateMemberRoleMutation(orgId);
  const [role, setRole] = useState<AppOrgRole>(member.role === "owner" ? "admin" : member.role);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    mutation.mutate(
      { userId: member.userId, orgRole: role },
      {
        onSuccess: () => { onClose(); toast.success(t("changeRoleSuccess")); },
        onError: () => toast.error(t("changeRoleError"))
      }
    );
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>{t("changeRoleTitle")}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="flex items-center gap-3 rounded-xl bg-muted p-3">
            <UserAvatar name={member.displayName} size={32} fallbackClassName="text-[11px]" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">{member.displayName}</p>
              <p className="truncate text-xs text-muted-foreground">{member.email}</p>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>{t("inviteRole")}</Label>
            <SelectNative value={role} onValueChange={(v) => setRole(v as AppOrgRole)}>
              <option value="admin">{t("roleAdmin")}</option>
              <option value="member">{t("roleMember")}</option>
            </SelectNative>
          </div>
          {mutation.isError ? (
            <p className="text-xs text-destructive">{String(mutation.error)}</p>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>{t("cancel")}</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? t("changeRoleSaving") : t("changeRoleSave")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Remove member dialog
// ---------------------------------------------------------------------------

function RemoveDialog({ member, orgId, onClose }: { member: OrgMember; orgId: string; onClose: () => void }) {
  const t = useTranslations("dashboard.organization");
  const toast = useToast();
  const mutation = useRemoveMemberMutation(orgId);

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>{t("removeTitle")}</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">{t("removeDescription")}</p>
        <div className="flex items-center gap-3 rounded-xl bg-muted p-3">
          <UserAvatar name={member.displayName} size={32} fallbackClassName="text-[11px]" />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">{member.displayName}</p>
            <p className="truncate text-xs text-muted-foreground">{member.email}</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{t("cancel")}</Button>
          <Button
            variant="outline"
            className="border-destructive text-destructive hover:bg-destructive/10"
            disabled={mutation.isPending}
            onClick={() => {
              mutation.mutate(member.userId, {
                onSuccess: () => { onClose(); toast.success(t("removeSuccess")); },
                onError: () => toast.error(t("removeError"))
              });
            }}
          >
            {mutation.isPending ? t("removing") : t("removeConfirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Bead 1 — Leave organization dialog
// ---------------------------------------------------------------------------

function LeaveDialog({ orgId, orgName, currentUserId, onClose }: {
  orgId: string;
  orgName: string;
  currentUserId: string;
  onClose: () => void;
}) {
  const t = useTranslations("dashboard.organization");
  const toast = useToast();
  const router = useRouter();
  const mutation = useLeaveOrgMutation(orgId);

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>{t("leaveTitle")}</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">{t("leaveDescription")}</p>
        <div className="rounded-xl bg-muted px-4 py-3">
          <p className="text-sm font-medium text-foreground">{orgName}</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{t("cancel")}</Button>
          <Button
            variant="outline"
            className="border-destructive text-destructive hover:bg-destructive/10"
            disabled={mutation.isPending}
            onClick={() => {
              mutation.mutate(currentUserId, {
                onSuccess: () => {
                  toast.success(t("leaveSuccess"));
                  router.push(routes.selectOrganization);
                },
                onError: () => toast.error(t("leaveError"))
              });
            }}
          >
            {mutation.isPending ? t("leaving") : t("leaveConfirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Transfer ownership dialog
// ---------------------------------------------------------------------------

function TransferOwnershipDialog({
  orgId,
  members,
  currentUserId,
  onClose,
}: {
  orgId: string;
  members: OrgMember[];
  currentUserId: string;
  onClose: () => void;
}) {
  const t = useTranslations("dashboard.organization");
  const toast = useToast();
  const mutation = useTransferOwnershipMutation(orgId);
  const eligible = members.filter(
    (m) => m.userId !== currentUserId && m.role !== "owner" && m.status === "active"
  );
  const [selectedUserId, setSelectedUserId] = useState(eligible[0]?.userId ?? "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedUserId) return;
    mutation.mutate(selectedUserId, {
      onSuccess: () => { onClose(); toast.success(t("transferSuccess")); },
      onError: () => toast.error(t("transferError"))
    });
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>{t("transferTitle")}</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">{t("transferDescription")}</p>
        <form onSubmit={handleSubmit} className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label>{t("columnName")}</Label>
            <SelectNative
              value={selectedUserId}
              onValueChange={setSelectedUserId}
            >
              {eligible.length === 0 ? (
                <option value="">{t("transferSelectPlaceholder")}</option>
              ) : (
                eligible.map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {m.displayName} ({m.email})
                  </option>
                ))
              )}
            </SelectNative>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>{t("cancel")}</Button>
            <Button
              type="submit"
              disabled={mutation.isPending || !selectedUserId}
              variant="outline"
              className="border-destructive/50 text-destructive hover:bg-destructive/10"
            >
              {mutation.isPending ? t("transferSaving") : t("transferSave")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Bead 3 — Inline rename org header
// ---------------------------------------------------------------------------

function OrgNameEditor({
  orgId,
  orgName,
}: {
  orgId: string;
  orgName: string;
}) {
  const t = useTranslations("dashboard.organization");
  const toast = useToast();
  const mutation = useRenameOrganizationMutation(orgId);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(orgName);

  function startEdit() {
    setDraft(orgName);
    setEditing(true);
  }

  function cancel() {
    setEditing(false);
  }

  function save() {
    const trimmed = draft.trim();
    if (!trimmed || trimmed === orgName) { cancel(); return; }
    mutation.mutate(trimmed, {
      onSuccess: () => { setEditing(false); toast.success(t("renameSuccess")); },
      onError: () => toast.error(t("renameError"))
    });
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <Input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") cancel();
          }}
          className="h-8 text-xl font-semibold"
          disabled={mutation.isPending}
        />
        <Button type="button" size="sm" className="h-8 px-2.5" onClick={save} disabled={mutation.isPending}>
          <Check className="h-3.5 w-3.5" />
        </Button>
        <Button type="button" size="sm" variant="ghost" className="h-8 px-2.5" onClick={cancel}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 group/rename">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">{orgName}</h1>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 w-7 p-0 text-muted-foreground opacity-0 group-hover/rename:opacity-100 transition-opacity"
        onClick={startEdit}
        title={t("renameButton")}
      >
        <Pencil className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Bead 4 & 5 — Pending invitations list with revoke + resend
// ---------------------------------------------------------------------------

function InvitationRow({
  inv,
  orgId,
}: {
  inv: OrgInvitation;
  orgId: string;
}) {
  const t = useTranslations("dashboard.organization");
  const toast = useToast();
  const revokeMutation = useRevokeInvitationMutation(orgId);
  const resendMutation = useInviteMemberMutation(orgId);
  const [resentLink, setResentLink] = useState<string | null>(null);

  if (resentLink) {
    return (
      <div className="flex flex-col gap-2 px-5 py-3.5 md:px-6">
        <p className="text-xs text-muted-foreground">{t("inviteLinkHint")}</p>
        <div className="flex items-center gap-2 rounded-xl bg-muted px-3 py-2">
          <span className="min-w-0 flex-1 truncate font-mono text-xs text-foreground">{resentLink}</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 w-7 shrink-0 p-0"
            onClick={() => navigator.clipboard.writeText(resentLink)}
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 w-7 shrink-0 p-0"
            onClick={() => setResentLink(null)}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="group flex items-center gap-3 px-5 py-3.5 md:px-6">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground text-sm font-medium">
        {inv.inviteeEmail.charAt(0).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{inv.inviteeEmail}</p>
        <p className="text-xs text-muted-foreground capitalize">{inv.orgRole}</p>
      </div>
      <Badge variant="secondary" className="shrink-0 capitalize hidden sm:inline-flex">
        {t("statusInvited")}
      </Badge>
      <div className="flex shrink-0 items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5 px-2.5 text-muted-foreground hover:text-foreground"
          disabled={resendMutation.isPending}
          onClick={() => {
            resendMutation.mutate(
              { inviteeEmail: inv.inviteeEmail, orgRole: inv.orgRole },
              {
                onSuccess: (data) => {
                  setResentLink(`${window.location.origin}/accept-invitation?token=${data.inviteToken}`);
                  toast.success(t("resendSuccess"));
                },
                onError: () => toast.error(t("resendError"))
              }
            );
          }}
        >
          <RefreshCw className="h-3.5 w-3.5" />
          {t("resendButton")}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5 px-2.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
          disabled={revokeMutation.isPending}
          onClick={() => {
            revokeMutation.mutate(inv.id, {
              onSuccess: () => toast.success(t("revokeSuccess")),
              onError: () => toast.error(t("revokeError"))
            });
          }}
        >
          <X className="h-3.5 w-3.5" />
          {t("revokeButton")}
        </Button>
      </div>
    </div>
  );
}

function InvitationsSection({ orgId, canManage }: { orgId: string; canManage: boolean }) {
  const t = useTranslations("dashboard.organization");
  const { data: invitations = [], isLoading } = useOrgInvitationsQuery(orgId);

  if (!canManage) return null;

  return (
    <div className="surface-panel rounded-2xl">
      <div className="border-b border-border/60 px-5 py-4 md:px-6">
        <h2 className="text-base font-semibold text-foreground">{t("invitationsTitle")}</h2>
        <p className="text-sm text-muted-foreground">{t("invitationsSubtitle")}</p>
      </div>

      {isLoading ? (
        <div className="p-5 md:p-6">
          <SectionLoadingState rows={2} />
        </div>
      ) : invitations.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-muted-foreground md:px-6">
          {t("invitationsEmpty")}
        </p>
      ) : (
        <div className="divide-y divide-border/40">
          {invitations.map((inv: OrgInvitation) => (
            <InvitationRow key={inv.id} inv={inv} orgId={orgId} />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function OrganizationPage() {
  const t = useTranslations("dashboard.organization");
  const tenant = useTenantContext();
  const currentUserId = useAuthStore((state) => state.profile?.id);

  const [showInvite, setShowInvite] = useState(false);
  const [changeRoleMember, setChangeRoleMember] = useState<OrgMember | null>(null);
  const [removeMember, setRemoveMember] = useState<OrgMember | null>(null);
  const [showLeave, setShowLeave] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);

  const { data: members = [], isLoading } = useOrgMembersQuery(tenant.selectedOrgId);

  if (!tenant.selectedOrgId || !tenant.selectedOrganization) {
    return (
      <section className="space-y-5">
        <div className="surface-panel rounded-2xl p-5 md:p-6">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{t("title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("noOrgSelected")}</p>
          <p className="mt-0.5 text-sm text-muted-foreground">{t("noOrgSelectedHint")}</p>
        </div>
      </section>
    );
  }

  const canManage = tenant.permissions.canManageMembers;
  const isOwner = tenant.orgRole === "owner";

  return (
    <section className="space-y-5 animate-fade-in-up">

      {/* Header — Bead 3: inline rename for owners */}
      <div className="surface-panel flex flex-col gap-4 rounded-2xl p-5 md:flex-row md:items-center md:justify-between md:p-6">
        <div className="flex items-center gap-4">
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Building2 className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            {isOwner ? (
              <OrgNameEditor orgId={tenant.selectedOrgId} orgName={tenant.selectedOrganization.name} />
            ) : (
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                {tenant.selectedOrganization.name}
              </h1>
            )}
            <p className="mt-0.5 text-sm text-muted-foreground">{t("subtitle")}</p>
          </div>
        </div>
        <Badge
          variant="outline"
          className={`self-start capitalize md:self-auto ${roleBadgeClass(tenant.orgRole)}`}
        >
          {roleLabel(tenant.orgRole, t)}
        </Badge>
      </div>

      {/* Bead 2 — Role permissions matrix */}
      <RolesMatrix />

      {/* Members */}
      <div className="surface-panel rounded-2xl">
        <div className="flex items-center justify-between border-b border-border/60 px-5 py-4 md:px-6">
          <div>
            <h2 className="text-base font-semibold text-foreground">{t("membersTitle")}</h2>
            <p className="text-sm text-muted-foreground">{t("membersSubtitle")}</p>
          </div>
          {canManage ? (
            <Button size="sm" onClick={() => setShowInvite(true)} className="shrink-0">
              <Plus className="mr-1.5 h-4 w-4" />
              {t("invite")}
            </Button>
          ) : null}
        </div>

        {isLoading ? (
          <div className="p-5 md:p-6">
            <SectionLoadingState rows={4} />
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            {members.map((member) => {
              const isMe = member.userId === currentUserId;
              const canChangeRole = isOwner && !isMe && member.role !== "owner";
              const canRemove =
                canManage &&
                !isMe &&
                member.role !== "owner" &&
                !(tenant.orgRole === "admin" && member.role === "admin");
              const canActOnMember = canChangeRole || canRemove;

              return (
                <div
                  key={member.userId}
                  className="group flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-muted/40 md:px-6"
                >
                  <UserAvatar name={member.displayName} size={36} fallbackClassName="text-[12px]" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="truncate text-sm font-medium text-foreground">
                        {member.displayName}
                      </span>
                      {isMe ? (
                        <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                          {t("you")}
                        </span>
                      ) : null}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">{member.email}</p>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <Badge
                      variant="outline"
                      className={`hidden capitalize sm:inline-flex ${roleBadgeClass(member.role)}`}
                    >
                      {roleLabel(member.role, t)}
                    </Badge>

                    {member.status === "invited" ? (
                      <Badge variant="secondary" className="hidden capitalize sm:inline-flex">
                        {t("statusInvited")}
                      </Badge>
                    ) : null}

                    {canActOnMember ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 opacity-0 transition-opacity group-hover:opacity-100"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {canChangeRole ? (
                            <DropdownMenuItem onClick={() => setChangeRoleMember(member)}>
                              <UserCog2 className="mr-2 h-4 w-4" />
                              {t("changeRole")}
                            </DropdownMenuItem>
                          ) : null}
                          {canChangeRole && canRemove ? <DropdownMenuSeparator /> : null}
                          {canRemove ? (
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => setRemoveMember(member)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              {t("remove")}
                            </DropdownMenuItem>
                          ) : null}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : (
                      <div className="h-7 w-7" />
                    )}
                  </div>
                </div>
              );
            })}

            {members.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-muted-foreground md:px-6">
                {t("empty")}
              </p>
            ) : null}
          </div>
        )}
      </div>

      {/* Beads 4 & 5 — Pending invitations */}
      <InvitationsSection orgId={tenant.selectedOrgId} canManage={canManage} />

      {/* Bead 1 — Danger zone */}
      <div className="rounded-2xl border border-destructive/25 bg-destructive/5 p-5 md:p-6">
        <div className="mb-4 flex items-start gap-3">
          <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
            <AlertTriangle className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-base font-semibold text-foreground">{t("dangerZone")}</h2>
            <p className="text-sm text-muted-foreground">{t("dangerZoneSubtitle")}</p>
          </div>
        </div>

        <div className="space-y-4">
          {isOwner ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">{t("transferTitle")}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{t("transferDescription")}</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="shrink-0 self-start border-destructive/50 text-destructive hover:bg-destructive/10 sm:self-auto"
                onClick={() => setShowTransfer(true)}
              >
                <ArrowRightLeft className="mr-1.5 h-4 w-4" />
                {t("transferButton")}
              </Button>
            </div>
          ) : null}

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">{t("leaveTitle")}</p>
              {isOwner ? (
                <p className="mt-0.5 text-xs text-muted-foreground">{t("leaveOwnerHint")}</p>
              ) : (
                <p className="mt-0.5 text-xs text-muted-foreground">{t("leaveDescription")}</p>
              )}
            </div>
            <Button
              size="sm"
              variant="outline"
              className="shrink-0 self-start border-destructive/50 text-destructive hover:bg-destructive/10 sm:self-auto"
              disabled={isOwner}
              onClick={() => setShowLeave(true)}
            >
              <LogOut className="mr-1.5 h-4 w-4" />
              {t("leaveButton")}
            </Button>
          </div>
        </div>
      </div>

      {/* Dialogs */}
      {showInvite ? (
        <InviteDialog orgId={tenant.selectedOrgId} onClose={() => setShowInvite(false)} />
      ) : null}

      {changeRoleMember ? (
        <ChangeRoleDialog
          member={changeRoleMember}
          orgId={tenant.selectedOrgId}
          onClose={() => setChangeRoleMember(null)}
        />
      ) : null}

      {removeMember ? (
        <RemoveDialog
          member={removeMember}
          orgId={tenant.selectedOrgId}
          onClose={() => setRemoveMember(null)}
        />
      ) : null}

      {showLeave && currentUserId ? (
        <LeaveDialog
          orgId={tenant.selectedOrgId}
          orgName={tenant.selectedOrganization.name}
          currentUserId={currentUserId}
          onClose={() => setShowLeave(false)}
        />
      ) : null}

      {showTransfer && currentUserId ? (
        <TransferOwnershipDialog
          orgId={tenant.selectedOrgId}
          members={members}
          currentUserId={currentUserId}
          onClose={() => setShowTransfer(false)}
        />
      ) : null}

    </section>
  );
}
