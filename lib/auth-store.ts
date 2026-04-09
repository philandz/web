"use client";

import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";

import type { IdentityOrganization, IdentityProfile } from "@/types/identity";
import type { AppUserType } from "@/lib/identity-normalize";

interface AuthState {
  hydrated: boolean;
  sessionNotice: "expired" | null;
  token: string | null;
  userType: AppUserType | null;
  profile: IdentityProfile | null;
  organizations: IdentityOrganization[];
  selectedOrgId: string | null;
  setSession: (payload: {
    token: string;
    userType: AppUserType;
    organizations: IdentityOrganization[];
  }) => void;
  setProfile: (profile: IdentityProfile) => void;
  setOrganizations: (organizations: IdentityOrganization[]) => void;
  selectOrganization: (orgId: string) => void;
  clearAuth: () => void;
  expireSession: () => void;
  clearSessionNotice: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      hydrated: false,
      sessionNotice: null,
      token: null,
      userType: null,
      profile: null,
      organizations: [],
      selectedOrgId: null,
      setSession: ({ token, userType, organizations }) =>
        set((state) => ({
          hydrated: true,
          sessionNotice: null,
          token,
          userType,
          organizations,
          selectedOrgId:
            userType === "super_admin"
              ? null
              : state.selectedOrgId && organizations.some((org) => org.id === state.selectedOrgId)
                ? state.selectedOrgId
                : null
        })),
      setProfile: (profile) => set({ profile }),
      setOrganizations: (organizations) => set({ organizations }),
      selectOrganization: (orgId) => set({ selectedOrgId: orgId }),
      clearAuth: () =>
        set({
          sessionNotice: null,
          token: null,
          userType: null,
          profile: null,
          organizations: [],
          selectedOrgId: null
        }),
      expireSession: () =>
        set({
          sessionNotice: "expired",
          token: null,
          userType: null,
          profile: null,
          organizations: [],
          selectedOrgId: null
        }),
      clearSessionNotice: () => set({ sessionNotice: null })
    }),
    {
      name: "philandz-web-auth",
      storage: createJSONStorage(
        (): StateStorage => ({
          getItem: (name) => {
            try {
              return window.localStorage.getItem(name);
            } catch {
              return null;
            }
          },
          setItem: (name, value) => {
            try {
              window.localStorage.setItem(name, value);
            } catch {
              // Ignore storage failures.
            }
          },
          removeItem: (name) => {
            try {
              window.localStorage.removeItem(name);
            } catch {
              // Ignore storage failures.
            }
          }
        })
      ),
      onRehydrateStorage: () => () => {
        useAuthStore.setState({ hydrated: true });
      }
    }
  )
);
