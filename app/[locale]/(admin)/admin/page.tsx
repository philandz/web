"use client";

import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { Search, ShieldCheck, UserCog2, Users } from "lucide-react";

import { StaggerItem } from "@/components/motion/stagger-item";
import { PageToolbar } from "@/components/philand/page-toolbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/lib/auth-store";

type MockUser = {
  id: string;
  email: string;
  displayName: string;
  userType: "normal" | "super_admin";
  status: "active" | "locked";
};

const MOCK_USERS: MockUser[] = [
  {
    id: "usr-01",
    email: "alex@example.com",
    displayName: "Alex Rivera",
    userType: "normal",
    status: "active"
  },
  {
    id: "usr-02",
    email: "mia@example.com",
    displayName: "Mia Tran",
    userType: "normal",
    status: "active"
  },
  {
    id: "usr-03",
    email: "ops@example.com",
    displayName: "Ops Control",
    userType: "super_admin",
    status: "active"
  },
  {
    id: "usr-04",
    email: "staging@example.com",
    displayName: "Staging User",
    userType: "normal",
    status: "locked"
  }
];

export default function AdminPage() {
  const tConsole = useTranslations("admin.console");
  const tCards = useTranslations("admin.cards");
  const tUsers = useTranslations("admin.userManagement");
  const [query, setQuery] = useState("");
  const profile = useAuthStore((state) => state.profile);
  const organizations = useAuthStore((state) => state.organizations);

  const filteredUsers = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return MOCK_USERS;

    return MOCK_USERS.filter((user) => {
      const text = `${user.displayName} ${user.email} ${user.userType}`.toLowerCase();
      return text.includes(normalized);
    });
  }, [query]);

  return (
    <div className="space-y-6">
      <StaggerItem delay={0}>
        <PageToolbar />
      </StaggerItem>

      <StaggerItem delay={40}>
        <Card className="rounded-2xl border-none bg-gradient-to-r from-slate-900 to-slate-800 text-white dark:from-slate-800 dark:to-slate-700">
          <CardContent className="flex flex-col gap-4 pt-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-300">{tConsole("badge")}</p>
              <h1 className="text-3xl font-semibold">{tConsole("title")}</h1>
              <p className="mt-1 text-sm text-slate-300">{tConsole("loggedInAs", { name: profile?.displayName ?? tConsole("role"), email: profile?.email ?? "-" })}</p>
            </div>
            <Badge className="bg-highlight text-slate-900">
              <ShieldCheck className="mr-1 h-3.5 w-3.5" /> {tConsole("role")}
            </Badge>
          </CardContent>
        </Card>
      </StaggerItem>

      <StaggerItem delay={90}>
        <Card className="surface-panel">
          <CardHeader>
            <CardTitle>{tUsers("orgOnboardingTitle")}</CardTitle>
            <CardDescription>{tUsers("orgOnboardingSubtitle")}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{tUsers("orgCount", { count: organizations.length })}</Badge>
            <Button variant="outline" size="sm" disabled>
              {tUsers("createOrganization")}
            </Button>
            <Button variant="secondary" size="sm" disabled={!organizations.length}>
              {tUsers("manageOrganizations")}
            </Button>
          </CardContent>
        </Card>
      </StaggerItem>

      <StaggerItem delay={110}>
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="surface-panel">
            <CardHeader className="pb-2">
              <CardDescription>{tCards("totalUsers")}</CardDescription>
              <CardTitle className="text-3xl font-semibold tracking-tight">{MOCK_USERS.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="surface-panel">
            <CardHeader className="pb-2">
              <CardDescription>{tCards("normalUsers")}</CardDescription>
              <CardTitle className="text-3xl font-semibold tracking-tight">{MOCK_USERS.filter((item) => item.userType === "normal").length}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="surface-panel">
            <CardHeader className="pb-2">
              <CardDescription>{tCards("superAdmins")}</CardDescription>
              <CardTitle className="text-3xl font-semibold tracking-tight">{MOCK_USERS.filter((item) => item.userType === "super_admin").length}</CardTitle>
            </CardHeader>
          </Card>
        </div>
      </StaggerItem>

      <StaggerItem delay={150}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Users className="h-5 w-5 text-primary" />
              {tUsers("title")}
            </CardTitle>
            <CardDescription>{tUsers("subtitle")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="pl-9"
                placeholder={tUsers("searchPlaceholder")}
              />
            </div>
            <p className="text-sm text-muted-foreground">{tUsers("results", { count: filteredUsers.length })}</p>

            <div className="grid gap-3 md:grid-cols-2">
              {filteredUsers.map((user) => (
                <article
                  className="rounded-xl border border-border/70 bg-card px-4 py-3 transition-all duration-200 ease-smooth hover:-translate-y-0.5 hover:shadow-soft"
                  key={user.id}
                >
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{user.displayName}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant={user.userType === "super_admin" ? "default" : "secondary"}>{user.userType}</Badge>
                      <Badge variant={user.status === "active" ? "secondary" : "outline"}>{user.status}</Badge>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" disabled>
                      <UserCog2 className="mr-1 h-4 w-4" /> {tUsers("edit")}
                    </Button>
                    <Button variant="secondary" size="sm" disabled>
                      {tUsers("changeType")}
                    </Button>
                    <Button variant="outline" size="sm" disabled>
                      {tUsers("lock")}
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          </CardContent>
        </Card>
      </StaggerItem>
    </div>
  );
}
