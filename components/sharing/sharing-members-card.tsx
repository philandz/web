"use client";

import { useState } from "react";
import { UserAvatar } from "@/components/ui/user-avatar";
import { BalancePill } from "@/components/ui/balance-pill";
import { useParticipantsQuery, useRevokeParticipantMutation } from "@/modules/sharing/hooks";
import { useAuthStore } from "@/lib/auth-store";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { UserPlus, UserX } from "lucide-react";
import { useToast } from "@/components/state/toast-provider";
import { Loader2 } from "lucide-react";
import { InviteMemberDialog } from "./invite-member-dialog";

type SharingMembersCardProps = {
  budgetId: string;
};

export function SharingMembersCard({ budgetId }: SharingMembersCardProps) {
  const { data: participants, isLoading } = useParticipantsQuery(budgetId);
  const currentUserId = useAuthStore((state) => state.profile?.id);
  const toast = useToast();
  const revokeMutation = useRevokeParticipantMutation();
  const [inviteOpen, setInviteOpen] = useState(false);

  const isOwnerOrManager = true; // For sharing budgets, the caller is
  // always at least a member of the parent budget; the sharing
  // service enforces the actual role on the backend. Showing the
  // button unconditionally keeps the UX simple for now.

  function handleRevoke(participantId: string, displayName: string) {
    if (!confirm(`Remove ${displayName} from this budget?`)) return;
    revokeMutation.mutate(
      { budgetId, participantId },
      {
        onSuccess: () => toast.success(`${displayName} removed`),
        onError: () => toast.error("Failed to remove participant"),
      }
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="h-5 w-32 bg-muted animate-pulse rounded" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
            <div className="flex-1 h-4 bg-muted animate-pulse rounded" />
            <div className="w-16 h-6 bg-muted animate-pulse rounded-full" />
          </div>
        ))}
      </div>
    );
  }

  if (!participants || participants.length === 0) {
    return (
      <EmptyState
        icon={<UserX className="h-6 w-6" />}
        title="No participants"
        description="Participants will appear here once they join"
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Members</h3>
        {isOwnerOrManager && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setInviteOpen(true)}
          >
            <UserPlus className="mr-1.5 h-3.5 w-3.5" />
            Invite
          </Button>
        )}
      </div>
      <div className="space-y-2">
        {participants.map((participant) => (
          <div
            key={participant.participantId}
            className="flex items-center gap-3 p-2 rounded-xl hover:bg-muted/50 transition-colors"
          >
            <UserAvatar
              name={participant.displayName}
              size={36}
              className="shrink-0"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-medium truncate">
                  {participant.displayName}
                </span>
                {participant.kind === "GUEST" && (
                  <span className="text-xs px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                    Guest
                  </span>
                )}
              </div>
            </div>
            <BalancePill value={0} size="sm" />
            {isOwnerOrManager && participant.participantId !== currentUserId && (
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-destructive"
                onClick={() => handleRevoke(participant.participantId, participant.displayName)}
                disabled={revokeMutation.isPending}
              >
                {revokeMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  "Revoke"
                )}
              </Button>
            )}
          </div>
        ))}
      </div>

      <InviteMemberDialog
        budgetId={budgetId}
        open={inviteOpen}
        onOpenChange={setInviteOpen}
      />
    </div>
  );
}