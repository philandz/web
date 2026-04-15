"use client";

import { useTranslations } from "next-intl";
import { Building2, ShieldCheck, Users } from "lucide-react";

import { StaggerItem } from "@/components/motion/stagger-item";
import { PageToolbar } from "@/components/philand/page-toolbar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useAuthStore } from "@/lib/auth-store";
import { useAdminOrgsQuery, useAdminUsersQuery } from "@/modules/admin/hooks";

export default function AdminPage() {
  const t = useTranslations("admin.console");
  const profile = useAuthStore((state) => state.profile);
  const { data: usersData } = useAdminUsersQuery({ pageSize: 100 });
  const { data: orgsData } = useAdminOrgsQuery({ pageSize: 100 });
  const users = usersData?.items ?? [];
  const orgs = orgsData?.items ?? [];
  const superAdminCount = users.filter((u) => u.userType === "super_admin").length;
  return (
    <div className="space-y-6">
      <StaggerItem delay={0}><PageToolbar /></StaggerItem>
      <StaggerItem delay={40}>
        <Card className="rounded-2xl border-none bg-gradient-to-r from-slate-900 to-slate-800 text-white">
          <CardContent className="flex flex-col gap-4 pt-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-widest text-slate-300">{t("badge")}</p>
              <h1 className="text-3xl font-semibold">{t("title")}</h1>
              <p className="mt-1 text-sm text-slate-300">{t("loggedInAs", { name: profile?.displayName ?? t("role"), email: profile?.email ?? "-" })}</p>
            </div>
            <Badge className="bg-highlight text-slate-900 self-start md:self-auto"><ShieldCheck className="mr-1 h-3.5 w-3.5" /> {t("role")}</Badge>
          </CardContent>
        </Card>
      </StaggerItem>
      <StaggerItem delay={80}>
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { label: t("kpiUsers"), value: users.length, icon: Users },
            { label: t("kpiOrgs"), value: orgs.length, icon: Building2 },
            { label: t("kpiAdmins"), value: superAdminCount, icon: ShieldCheck },
          ].map(({ label, value, icon: Icon }) => (
            <Card key={label} className="surface-panel">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <p className="text-sm text-muted-foreground">{label}</p>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent><p className="text-3xl font-semibold tracking-tight">{value}</p></CardContent>
            </Card>
          ))}
        </div>
      </StaggerItem>
    </div>
  );
}
