"use client";

import { SharingBudgetView } from "@/components/sharing/sharing-budget-view";

type PageProps = {
  params: { budgetId: string };
};

export default function SharingBudgetPage({ params }: PageProps) {
  return <SharingBudgetView budgetId={params.budgetId} />;
}