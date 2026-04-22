"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { MoreHorizontal, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectNative } from "@/components/ui/select";
import { UserAvatar } from "@/components/ui/user-avatar";
import { SectionLoadingState } from "@/components/state/section-loading-state";
import { useToast } from "@/components/state/toast-provider";
import { useAddMemberMutation, useBudgetMembersQuery, useRemoveMemberMutation, useUpdateMemberRoleMutation } from "@/modules/budget/hooks";
import { useAuthStore } from "@/lib/auth-store";
import type { BudgetMember, BudgetRole } from "@/services/budget-service";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Role badge
// ---------------------------------------------------------------------------

const ROLE_STYLES: Record<BudgetRole, string> = {
  owner:       "border-amber-200 bg-amber-500/10 text-amber-600 dark:border-amber-800 dark:text-amber-400",
  manager:     "border-blue-200 bg-blue-500/10 text-blue-600 dark:border-blue-800 dark:text-blue-400",
  contributor: "border-emerald-200 bg-emerald-500/10 text-emerald-600 dark:border-emerald-800 dark:text-emerald-400",
  viewer:      "border-slate-200 bg-slate-500/10 text-slate-500 dark:border-slate-700",
};

function RoleBadge({ role }: { role: BudgetRole }) {
  const t = useTranslations("budget.members");
  const labelKey = `role${role.charAt(0).toUpperCase()}${role.slice(1)}` as
    | "roleOwner" | "roleManager" | "roleContributor" | "roleViewer";
  return (
    <span className={cn(
      "inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold",
      ROLE_STYLES[role],
    )}>
      {t(labelKey)}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Invite dialog
// ---------------------------------------------------------------------------

function InviteMemberDialog({ open, onClose, budgetId }: { open: boolean; onClose: () => void; budgetId: string }) {
  const t = useTranslations("budget.members");
  const toast = useToast();
  const mutation = useAddMemberMutation(budgetId);
  const [userId, setUserId] = useState("");
  const [role, setRole] = useState<BudgetRole>("contributor");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId.trim()) return;
    mutation.mutate(
      { userId: userId.trim(), role },
      {
        onSuccess: () => { toast.success(t("inviteSuccess")); onClose(); setUserId(""); setRole("contributor"); },
        onError: () => toast.error(t("inviteError")),
      }
    );
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>{t("inviteTitle")}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>{t("userId")}</Label>
            <Input
              required
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder={t("userIdPlaceholder")}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("role")}</Label>
            <SelectNative value={role} onValueChange={(v) => setRole(v as BudgetRole)}>
              <option value="manager">{t("roleManager")}</option>
              <option value="contributor">{t("roleContributor")}</option>
              <option value="viewer">{t("roleViewer")}</option>
            </SelectNative>
          </div>
          {mutation.isError ? <p className="text-xs text-destructive">{t("inviteError")}</p> : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>{t("cancel")}</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? t("inviting") : t("invite")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Change role dialog
// ---------------------------------------------------------------------------

function ChangeRoleDialog({ member, budgetId, onClose }: { member: BudgetMember; budgetId: string; onClose: () => void }) {
  const t = useTranslations("budget.members");
  const toast = useToast();
  const mutation = useUpdateMemberRoleMutation(budgetId);
  const [role, setRole] = useState<BudgetRole>(member.role === "owner" ? "manager" : member.role);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    mutation.mutate(
      { userId: member.userId, role },
      {
        onSuccess: () => { toast.success(t("changeRoleSuccess")); onClose(); },
        onError: () => toast.error(t("changeRoleError")),
      }
    );
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>{t("changeRoleTitle")}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="flex items-center gap-3 rounded-xl bg-muted p-3">
            <UserAvatar name={member.displayName} size={36} fallbackClassName="text-xs" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">{member.displayName}</p>
              <p className="truncate text-xs text-muted-foreground">{member.email}</p>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>{t("role")}</Label>
            <SelectNative value={role} onValueChange={(v) => setRole(v as BudgetRole)}>
              <option value="manager">{t("roleManager")}</option>
              <option value="contributor">{t("roleContributor")}</option>
              <option value="viewer">{t("roleViewer")}</option>
            </SelectNative>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>{t("cancel")}</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? t("saving") : t("save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Members tab
// ---------------------------------------------------------------------------

interface MembersTabProps {
  budgetId: string;
  myRole: BudgetRole;
}

export function MembersTab({ budgetId, myRole }: MembersTabProps) {
  const t = useTranslations("budget.members");
  const toast = useToast();
  const profile = useAuthStore((s) => s.profile);
  const currentUserId = profile?.id;

  const { data: members = [], isLoading } = useBudgetMembersQuery(budgetId);
  const removeMutation = useRemoveMemberMutation(budgetId);

  const [changeRoleMember, setChangeRoleMember] = useState<BudgetMember | null>(null);
  const [removeMember, setRemoveMember] = useState<BudgetMember | null>(null);
  const [localInviteOpen, setLocalInviteOpen] = useState(false);

  const canManage = myRole === "owner" || myRole === "manager";
  const isOwner = myRole === "owner";

  function handleRemove() {
    if (!removeMember) return;
    removeMutation.mutate(removeMember.userId, {
      onSuccess: () => { toast.success(t("removeSuccess")); setRemoveMember(null); },
      onError: () => toast.error(t("removeError")),
    });
  }

  if (isLoading) return <SectionLoadingState rows={3} />;

  return (
    <div className="surface-panel overflow-hidden rounded-2xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/60 px-5 py-4 md:px-6">
        <div>
          <h2 className="text-base font-semibold text-foreground">{t("title")}</h2>
          <p className="text-sm text-muted-foreground">{members.length} {t("members")}</p>
        </div>
        {canManage ? (
          <Button size="sm" onClick={() => setLocalInviteOpen(true)}>
            <UserPlus className="mr-1.5 h-3.5 w-3.5" />{t("invite")}
          </Button>
        ) : null}
      </div>

      {/* Member list */}
      <div className="divide-y divide-border/40">
        {members.map((member) => {
          const isMe = member.userId === currentUserId;
          const canChangeRole = isOwner && !isMe && member.role !== "owner";
          const canRemove = canManage && !isMe && member.role !== "owner";
          const avatarSrc = isMe ? (profile?.avatar ?? undefined) : undefined;

          return (
            <div key={member.userId} className="flex items-center gap-3 px-5 py-3.5 md:px-6">
              {/* Avatar */}
              <UserAvatar
                name={member.displayName}
                src={avatarSrc}
                size={38}
                fallbackClassName="text-xs font-semibold"
              />

              {/* Name + email */}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="truncate text-sm font-medium text-foreground leading-snug">
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

              {/* Role badge */}
              <RoleBadge role={member.role} />

              {/* Actions menu */}
              {(canChangeRole || canRemove) ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 shrink-0 p-0">
                      <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {canChangeRole ? (
                      <DropdownMenuItem onClick={() => setChangeRoleMember(member)}>
                        {t("changeRole")}
                      </DropdownMenuItem>
                    ) : null}
                    {canChangeRole && canRemove ? <DropdownMenuSeparator /> : null}
                    {canRemove ? (
                      <DropdownMenuItem className="text-destructive" onClick={() => setRemoveMember(member)}>
                        {t("remove")}
                      </DropdownMenuItem>
                    ) : null}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <div className="h-8 w-8 shrink-0" />
              )}
            </div>
          );
        })}
      </div>

      {/* Invite dialog */}
      <InviteMemberDialog
        open={localInviteOpen}
        onClose={() => setLocalInviteOpen(false)}
        budgetId={budgetId}
      />

      {/* Change role dialog */}
      {changeRoleMember ? (
        <ChangeRoleDialog
          member={changeRoleMember}
          budgetId={budgetId}
          onClose={() => setChangeRoleMember(null)}
        />
      ) : null}

      {/* Remove confirmation */}
      <Dialog open={Boolean(removeMember)} onOpenChange={(v) => !v && setRemoveMember(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>{t("removeTitle")}</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">{t("removeDescription")}</p>
          {removeMember ? (
            <div className="flex items-center gap-3 rounded-xl bg-muted p-3">
              <UserAvatar name={removeMember.displayName} size={36} fallbackClassName="text-xs" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{removeMember.displayName}</p>
                <p className="truncate text-xs text-muted-foreground">{removeMember.email}</p>
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveMember(null)}>{t("cancel")}</Button>
            <Button
              variant="outline"
              className="border-destructive text-destructive hover:bg-destructive/10"
              disabled={removeMutation.isPending}
              onClick={handleRemove}
            >
              {removeMutation.isPending ? t("removing") : t("confirmRemove")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
