/**
 * Join-budget layout for guest users.
 *
 * This page is accessed without authentication (no JWT), so it uses its own
 * minimal layout instead of the dashboard or auth shells.
 *
 * Layout: centered card on a soft gradient background — no nav, no shell.
 */

export default function JoinBudgetLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-background to-orange-50 flex items-center justify-center px-4">
      {children}
    </div>
  );
}
