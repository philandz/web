"use client";

import { useState } from "react";

import { ContentCanvas } from "@/components/philand/content-canvas";
import { PreviewSidebar } from "@/components/philand/preview-sidebar";

export default function PreviewPage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <main className="min-h-screen bg-[#f3f5f8] p-4 dark:bg-[#14162E] md:p-6">
      <div className="mx-auto max-w-[1400px]">
        <div className={sidebarCollapsed ? "grid gap-4 md:grid-cols-[88px_1fr]" : "grid gap-4 md:grid-cols-[240px_1fr]"}>
          <PreviewSidebar
            profileName="Preview User"
            onSignOut={() => {}}
            collapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
          />

          <ContentCanvas />
        </div>
      </div>
    </main>
  );
}
