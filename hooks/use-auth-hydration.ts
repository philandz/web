"use client";

import { useAuthStore } from "@/lib/auth-store";

export function useAuthHydration() {
  return useAuthStore((state) => state.hydrated);
}
