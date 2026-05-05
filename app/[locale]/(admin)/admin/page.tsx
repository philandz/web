"use client";

import { useTranslations } from "next-intl";
import { Building2, ShieldCheck, Users } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { StaggerItem } from "@/components/motion/stagger-item";
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
      <StaggerItem delay={0}>
        <PageHeader
          title={t("title")}
          description={t("loggedInAs", { name: profile?.displayName ?? t("role"), email: profile?.email ?? "-" })}
          eyebrow={t("badge")}
          icon={<ShieldCheck className="h-5 w-5" />}
          actions={<Badge className="bg-highlight text-slate-900"><ShieldCheck className="mr-1 h-3.5 w-3.5" /> {t("role")}</Badge>}
        />
      </StaggerItem>
      <StaggerItem delay={40}>
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
