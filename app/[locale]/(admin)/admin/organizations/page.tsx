"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { MoreHorizontal, Plus, Search, Trash2, UserCog2 } from "lucide-react";

import { SectionLoadingState } from "@/components/state/section-loading-state";
import { useToast } from "@/components/state/toast-provider";
import { FilterBadge, Pagination, SortButton, StatusChip } from "@/components/philand/data-table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectNative } from "@/components/ui/select";
import type { AdminOrg, AdminUser, ListParams } from "@/services/admin-service";
import {
  useAdminOrgsQuery, useAdminUsersQuery,
  useCreateOrgMutation, useDeleteOrgMutation, useUpdateOrgMutation,
} from "@/modules/admin/hooks";

// ---------------------------------------------------------------------------
// Dialogs
// ---------------------------------------------------------------------------

function DeleteDialog({ open, title, description, onConfirm, onClose, isPending }: {
  open: boolean; title: string; description: string;
  onConfirm: () => void; onClose: () => void; isPending: boolean;
}) {
  const t = useTranslations("admin.common");
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">{description}</p>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{t("cancel")}</Button>
          <Button variant="outline" className="border-destructive text-destructive hover:bg-destructive/10" onClick={onConfirm} disabled={isPending}>
            {isPending ? t("deleting") : t("delete")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CreateOrgDialog({ open, onClose, users }: { open: boolean; onClose: () => void; users: AdminUser[] }) {
  const t = useTranslations("admin.orgs");
  const toast = useToast();
  const mutation = useCreateOrgMutation();
  const [form, setForm] = useState({ name: "", ownerUserId: "" });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    mutation.mutate(
      { name: form.name, ownerUserId: form.ownerUserId },
      {
        onSuccess: () => { onClose(); setForm({ name: "", ownerUserId: "" }); toast.success(t("createSuccess")); },
        onError: () => toast.error(t("createError")),
      }
    );
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>{t("createTitle")}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>{t("name")}</Label>
            <Input required value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>{t("owner")}</Label>
            <SelectNative value={form.ownerUserId} onValueChange={(v) => setForm((p) => ({ ...p, ownerUserId: v }))}>
              <option value="" disabled>{t("ownerPlaceholder")}</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.displayName} ({u.email})</option>)}
            </SelectNative>
          </div>
          {mutation.isError ? <p className="text-xs text-destructive">{String(mutation.error)}</p> : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>{t("cancel")}</Button>
            <Button type="submit" disabled={mutation.isPending || !form.ownerUserId}>
              {mutation.isPending ? t("creating") : t("create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditOrgDialog({ org, onClose }: { org: AdminOrg; onClose: () => void }) {
  const t = useTranslations("admin.orgs");
  const toast = useToast();
  const mutation = useUpdateOrgMutation();
  const [form, setForm] = useState({ name: org.name, status: org.status });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    mutation.mutate(
      { orgId: org.id, input: { name: form.name, status: form.status } },
      {
        onSuccess: () => { onClose(); toast.success(t("updateSuccess")); },
        onError: () => toast.error(t("updateError")),
      }
    );
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>{t("editTitle")}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>{t("name")}</Label>
            <Input required value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>{t("status")}</Label>
            <SelectNative value={form.status} onValueChange={(v) => setForm((p) => ({ ...p, status: v as "active" | "disabled" }))}>
              <option value="active">{t("statusActive")}</option>
              <option value="disabled">{t("statusDisabled")}</option>
            </SelectNative>
          </div>
          {mutation.isError ? <p className="text-xs text-destructive">{String(mutation.error)}</p> : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>{t("cancel")}</Button>
            <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? t("saving") : t("save")}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AdminOrgsPage() {
  const t = useTranslations("admin.orgs");
  const toast = useToast();

  const [params, setParams] = useState<ListParams>({ page: 1, pageSize: 20 });
  const [sortKey, setSortKey] = useState<string>("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const [showCreate, setShowCreate] = useState(false);
  const [editOrg, setEditOrg] = useState<AdminOrg | null>(null);
  const [deleteOrgId, setDeleteOrgId] = useState<string | null>(null);
  const deleteMutation = useDeleteOrgMutation();

  const { data, isLoading } = useAdminOrgsQuery(params);
  const orgs = data?.items ?? [];
  const meta = data?.meta ?? { page: 1, pageSize: 20, totalPages: 1, totalRows: 0 };

  // Load all users (no pagination) for the owner dropdown in create dialog
  const { data: usersData } = useAdminUsersQuery({ pageSize: 100 });
  const users = usersData?.items ?? [];
  const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

  function update(patch: Partial<ListParams>) {
    setParams((p) => ({ ...p, ...patch, page: patch.page ?? 1 }));
  }

  function toggleSort(key: string) {
    const newDir = sortKey === key && sortDir === "asc" ? "desc" : "asc";
    setSortKey(key);
    setSortDir(newDir);
    update({ sortBy: key, sortDir: newDir });
  }

  const hasFilters = Boolean(params.q || params.status);

  return (
    <div className="space-y-5 animate-fade-in-up">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{t("pageTitle")}</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">{t("pageSubtitle")}</p>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)} className="shrink-0 self-start sm:self-auto">
          <Plus className="mr-1.5 h-4 w-4" />{t("create")}
        </Button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={params.q ?? ""}
            onChange={(e) => update({ q: e.target.value || undefined })}
            className="pl-9"
            placeholder={t("searchPlaceholder")}
          />
        </div>
        <SelectNative value={params.status ?? ""} onValueChange={(v) => update({ status: v || undefined })} className="w-32">
          <option value="">{t("allStatuses")}</option>
          <option value="active">{t("statusActive")}</option>
          <option value="disabled">{t("statusDisabled")}</option>
        </SelectNative>
        {hasFilters ? (
          <button onClick={() => update({ q: undefined, status: undefined })} className="text-xs text-muted-foreground underline hover:text-foreground">
            {t("clearFilters")}
          </button>
        ) : null}
      </div>

      {hasFilters ? (
        <div className="flex flex-wrap gap-1.5">
          {params.status ? <FilterBadge label={params.status === "active" ? t("statusActive") : t("statusDisabled")} onClear={() => update({ status: undefined })} /> : null}
        </div>
      ) : null}

      {/* Table */}
      {isLoading ? <SectionLoadingState rows={5} /> : (
        <div className="surface-panel overflow-hidden rounded-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 text-left">
                  <th className="px-4 py-3"><SortButton label={t("name")} active={sortKey === "name"} dir={sortDir} onClick={() => toggleSort("name")} /></th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("ownerLabel")}</th>
                  <th className="px-4 py-3"><SortButton label={t("status")} active={sortKey === "status"} dir={sortDir} onClick={() => toggleSort("status")} /></th>
                  <th className="w-10 px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {orgs.map((org) => {
                  const owner = userMap[org.ownerId];
                  return (
                    <tr key={org.id} className="group transition-colors hover:bg-muted/40">
                      <td className="px-4 py-3 font-medium text-foreground">{org.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {owner ? (
                          <span>{owner.displayName} <span className="text-xs opacity-60">({owner.email})</span></span>
                        ) : (
                          <span className="text-xs opacity-50">{org.ownerId}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <StatusChip value={org.status} label={org.status === "active" ? t("statusActive") : t("statusDisabled")} />
                      </td>
                      <td className="px-4 py-3">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setEditOrg(org)}><UserCog2 className="mr-2 h-4 w-4" />{t("edit")}</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive" onClick={() => setDeleteOrgId(org.id)}><Trash2 className="mr-2 h-4 w-4" />{t("delete")}</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
                {orgs.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-10 text-center text-sm text-muted-foreground">{t("empty")}</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>
          <div className="border-t border-border/40 px-4 pb-3">
            <Pagination
              page={meta.page}
              totalPages={meta.totalPages}
              totalRows={meta.totalRows}
              pageSize={meta.pageSize}
              onPage={(p) => update({ page: p })}
              onPageSize={(s) => update({ pageSize: s, page: 1 })}
            />
          </div>
        </div>
      )}

      {showCreate ? <CreateOrgDialog open onClose={() => setShowCreate(false)} users={users} /> : null}
      {editOrg ? <EditOrgDialog org={editOrg} onClose={() => setEditOrg(null)} /> : null}
      <DeleteDialog
        open={Boolean(deleteOrgId)}
        title={t("deleteTitle")}
        description={t("deleteDescription")}
        isPending={deleteMutation.isPending}
        onClose={() => setDeleteOrgId(null)}
        onConfirm={() => {
          if (!deleteOrgId) return;
          deleteMutation.mutate(deleteOrgId, {
            onSuccess: () => { setDeleteOrgId(null); toast.success(t("deleteSuccess")); },
            onError: () => toast.error(t("deleteError")),
          });
        }}
      />
    </div>
  );
}
