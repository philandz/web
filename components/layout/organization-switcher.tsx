"use client";

import { Building2, Check, ChevronsUpDown } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { IdentityOrganization } from "@/types/identity";
import { cn } from "@/lib/utils";

interface OrganizationSwitcherProps {
  organizations: IdentityOrganization[];
  selectedOrgId: string | null;
  onSelect: (orgId: string) => void;
}

export function OrganizationSwitcher({ organizations, selectedOrgId, onSelect }: OrganizationSwitcherProps) {
  const [open, setOpen] = useState(false);
  const selectedOrg = organizations.find((org) => org.id === selectedOrgId) ?? organizations[0] ?? null;

  return (
    <div className="relative">
      <Button variant="outline" className="w-full justify-between" onClick={() => setOpen((prev) => !prev)}>
        <span className="flex items-center gap-2 truncate">
          <Building2 className="h-4 w-4 text-highlight" />
          <span className="truncate">{selectedOrg?.name ?? "Select organization"}</span>
        </span>
        <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
      </Button>

      {open ? (
        <div className="absolute z-30 mt-2 w-full rounded-xl border border-border/80 bg-card p-2 shadow-float">
          {organizations.length ? (
            <ul className="space-y-1">
              {organizations.map((org) => {
                const active = org.id === selectedOrg?.id;
                return (
                  <li key={org.id}>
                    <button
                      className={cn(
                        "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors",
                        active ? "active-lime" : "hover:bg-muted"
                      )}
                      onClick={() => {
                        onSelect(org.id);
                        setOpen(false);
                      }}
                    >
                      <span className="flex flex-col">
                        <span className="font-medium">{org.name}</span>
                        <span className="text-xs text-muted-foreground">{org.id.slice(0, 8)}</span>
                      </span>
                      <span className="flex items-center gap-2">
                        <Badge variant="secondary" className="capitalize">
                          {org.role}
                        </Badge>
                        {active ? <Check className="h-4 w-4 text-highlight" /> : null}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="px-3 py-2 text-sm text-muted-foreground">No organizations available</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
