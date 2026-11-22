"use client";

import { Info, Megaphone, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/state/empty-state";
import { InlineAlert } from "@/components/state/inline-alert";
import { useToast } from "@/components/state/toast-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { getFormErrorMessage } from "@/lib/form-errors";
import {
  useAdminBroadcastsQuery,
  useArchiveBroadcastMutation,
  useCreateBroadcastMutation,
  usePublishBroadcastMutation,
  useUpdateBroadcastMutation,
} from "@/modules/notification/hooks";
import { validateBroadcast, type BroadcastDraft } from "@/modules/notification/broadcast-form";
import type { Broadcast, BroadcastAudience, NotificationSeverity } from "@/services/notification-service";

const EMPTY: BroadcastDraft = {
  audience: "all",
  userIds: "",
  severity: "info",
  titleVi: "",
  bodyVi: "",
  titleEn: "",
  bodyEn: "",
  link: "",
  showBanner: false,
};

function toDraft(b: Broadcast): BroadcastDraft {
  return {
    audience: b.audience,
    userIds: b.audienceUserIds.join(", "),
    severity: b.severity,
    titleVi: b.titleVi,
    bodyVi: b.bodyVi,
    titleEn: b.titleEn,
    bodyEn: b.bodyEn,
    link: b.link,
    showBanner: b.showBanner,
  };
}

/** What users will get, shown before a broadcast goes out (it cannot be unsent). */
function PublishDialog({
  broadcast,
  pending,
  onCancel,
  onConfirm,
}: {
  broadcast: Broadcast;
  pending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const t = useTranslations("notification.admin");
  const audience =
    broadcast.audience === "users"
      ? t("audienceSummaryUsers", { count: broadcast.audienceUserIds.length })
      : t("audienceSummaryAll");
  const tone =
    broadcast.severity === "critical"
      ? "border-destructive/40 bg-destructive/10"
      : broadcast.severity === "warning"
        ? "border-amber-500/40 bg-amber-500/10"
        : "border-border bg-muted/40";
  const Icon = broadcast.severity === "info" ? Info : TriangleAlert;
  return (
    <Dialog open onOpenChange={(v) => !v && onCancel()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("publishConfirmTitle")}</DialogTitle>
          <DialogDescription>{t("publishConfirmBody", { audience })}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-1" data-testid="broadcast-preview">
          {[
            { lang: "VI", title: broadcast.titleVi, body: broadcast.bodyVi },
            { lang: "EN", title: broadcast.titleEn, body: broadcast.bodyEn },
          ].map((v) => (
            <div key={v.lang} className={`flex gap-3 rounded-xl border p-3 ${tone}`}>
              <Icon className="mt-0.5 h-4 w-4 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">
                  <span className="mr-2 rounded bg-background px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground">{v.lang}</span>
                  {v.title}
                </p>
                <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">{v.body}</p>
              </div>
            </div>
          ))}
          <p className="text-xs text-muted-foreground">
            {broadcast.showBanner ? t("previewWithBanner") : t("previewInboxOnly")}
            {broadcast.link ? ` · ${broadcast.link}` : ""}
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={pending}>
            {t("cancel")}
          </Button>
          <Button onClick={onConfirm} disabled={pending} data-testid="confirm-publish">
            {t("publishNow")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminNotificationsPage() {
  const t = useTranslations("notification.admin");
  const tStatus = useTranslations("notification.admin.status");
  const toast = useToast();
  const list = useAdminBroadcastsQuery({ limit: 50 });
  const create = useCreateBroadcastMutation();
  const update = useUpdateBroadcastMutation();
  const publish = usePublishBroadcastMutation();
  const [confirming, setConfirming] = useState<Broadcast | null>(null);
  const archive = useArchiveBroadcastMutation();

  const [draft, setDraft] = useState<BroadcastDraft>(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [serverError, setServerError] = useState("");

  const set = <K extends keyof BroadcastDraft>(k: K, v: BroadcastDraft[K]) => setDraft((d) => ({ ...d, [k]: v }));

  function save() {
    setServerError("");
    const result = validateBroadcast(draft);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors([]);
    const onError = (e: unknown) => setServerError(getFormErrorMessage(e, t("saveError")));
    const done = () => {
      toast.success(t("saved"));
      setDraft(EMPTY);
      setEditingId(null);
    };
    if (editingId) update.mutate({ id: editingId, input: result.input }, { onSuccess: done, onError });
    else create.mutate(result.input, { onSuccess: done, onError });
  }

  const busy = create.isPending || update.isPending;
  const editable = (b: Broadcast) => b.status === "draft" || b.status === "scheduled";

  return (
    <section className="space-y-5 animate-fade-in-up">
      <PageHeader title={t("title")} description={t("subtitle")} icon={<Megaphone className="h-5 w-5" />} />

      <article className="surface-panel space-y-4 rounded-2xl p-5 md:p-6">
        <h2 className="text-sm font-semibold text-foreground">{editingId ? t("editTitle") : t("newTitle")}</h2>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-1 text-xs text-muted-foreground">
            {t("audience")}
            <select
              className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm text-foreground"
              value={draft.audience}
              onChange={(e) => set("audience", e.target.value as BroadcastAudience)}
            >
              <option value="all">{t("audienceAll")}</option>
              <option value="users">{t("audienceUsers")}</option>
            </select>
          </label>
          <label className="space-y-1 text-xs text-muted-foreground">
            {t("severity")}
            <select
              className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm text-foreground"
              value={draft.severity}
              onChange={(e) => set("severity", e.target.value as NotificationSeverity)}
            >
              <option value="info">{t("severityInfo")}</option>
              <option value="warning">{t("severityWarning")}</option>
              <option value="critical">{t("severityCritical")}</option>
            </select>
          </label>
        </div>

        {draft.audience === "users" ? (
          <label className="block space-y-1 text-xs text-muted-foreground">
            {t("userIds")}
            <Input value={draft.userIds} onChange={(e) => set("userIds", e.target.value)} placeholder={t("userIdsPlaceholder")} />
          </label>
        ) : null}

        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <label className="block space-y-1 text-xs text-muted-foreground">
              {t("titleVi")}
              <Input value={draft.titleVi} onChange={(e) => set("titleVi", e.target.value)} maxLength={120} />
            </label>
            <label className="block space-y-1 text-xs text-muted-foreground">
              {t("bodyVi")}
              <textarea
                className="min-h-[88px] w-full rounded-xl border border-border bg-card p-3 text-sm text-foreground"
                value={draft.bodyVi}
                onChange={(e) => set("bodyVi", e.target.value)}
                maxLength={1000}
              />
            </label>
          </div>
          <div className="space-y-2">
            <label className="block space-y-1 text-xs text-muted-foreground">
              {t("titleEn")}
              <Input value={draft.titleEn} onChange={(e) => set("titleEn", e.target.value)} maxLength={120} />
            </label>
            <label className="block space-y-1 text-xs text-muted-foreground">
              {t("bodyEn")}
              <textarea
                className="min-h-[88px] w-full rounded-xl border border-border bg-card p-3 text-sm text-foreground"
                value={draft.bodyEn}
                onChange={(e) => set("bodyEn", e.target.value)}
                maxLength={1000}
              />
            </label>
          </div>
        </div>

        <label className="block space-y-1 text-xs text-muted-foreground">
          {t("link")}
          <Input value={draft.link} onChange={(e) => set("link", e.target.value)} placeholder="/budgets" />
        </label>

        <label className="flex items-center gap-2 text-sm text-foreground">
          <input type="checkbox" checked={draft.showBanner} onChange={(e) => set("showBanner", e.target.checked)} />
          {t("showBanner")}
        </label>

        {errors.length > 0 ? (
          <InlineAlert tone="error">{errors.map((k) => t(`errors.${k}`)).join(" · ")}</InlineAlert>
        ) : null}
        {serverError ? <InlineAlert tone="error">{serverError}</InlineAlert> : null}

        <div className="flex gap-2">
          <Button onClick={save} disabled={busy}>
            {editingId ? t("saveChanges") : t("saveDraft")}
          </Button>
          {editingId ? (
            <Button
              variant="outline"
              onClick={() => {
                setEditingId(null);
                setDraft(EMPTY);
                setErrors([]);
              }}
            >
              {t("cancel")}
            </Button>
          ) : null}
        </div>
      </article>

      {list.isLoading ? (
        <Skeleton className="h-40 w-full rounded-2xl" />
      ) : list.isError ? (
        <EmptyState
          title={t("loadError")}
          action={
            <Button variant="outline" onClick={() => list.refetch()}>
              {t("retry")}
            </Button>
          }
        />
      ) : (list.data?.broadcasts.length ?? 0) === 0 ? (
        <EmptyState title={t("empty")} />
      ) : (
        <ul className="space-y-3" data-testid="broadcast-list">
          {list.data?.broadcasts.map((b) => (
            <li key={b.id} className="surface-panel flex flex-col gap-3 rounded-2xl p-4 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-semibold text-foreground">{b.titleVi || b.titleEn}</p>
                  <Badge>{tStatus(b.status)}</Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("readBy", { count: b.readCount })} ·{" "}
                  {b.audience === "users"
                    ? t("audienceSummaryUsers", { count: b.audienceUserIds.length })
                    : t("audienceSummaryAll")}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                {editable(b) ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingId(b.id);
                      setDraft(toDraft(b));
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                  >
                    {t("edit")}
                  </Button>
                ) : null}
                {b.status === "draft" ? (
                  <Button
                    size="sm"
                    disabled={publish.isPending}
                    onClick={() => setConfirming(b)}
                  >
                    {t("publish")}
                  </Button>
                ) : null}
                {b.status !== "archived" ? (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={archive.isPending}
                    onClick={() => archive.mutate(b.id, { onError: (e) => toast.error(getFormErrorMessage(e, t("saveError"))) })}
                  >
                    {t("archive")}
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}

      {confirming ? (
        <PublishDialog
          broadcast={confirming}
          pending={publish.isPending}
          onCancel={() => setConfirming(null)}
          onConfirm={() =>
            publish.mutate(confirming.id, {
              onSuccess: () => {
                toast.success(t("published"));
                setConfirming(null);
              },
              onError: (e) => toast.error(getFormErrorMessage(e, t("saveError"))),
            })
          }
        />
      ) : null}
    </section>
  );
}
