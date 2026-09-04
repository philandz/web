import { apiClient } from "@/lib/http/client";
import { writeSharingSession } from "@/lib/sharing/session";

const BASE = "/api/sharing";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SplitMethod = "equal" | "custom" | "weighted" | "percentage" | "by_item";

export interface ExpenseLeg {
  userId: string;
  amount: number;
  weight?: number; // for weighted split
}

export interface ExpenseItem {
  id: string;
  label: string;
  amount: number;
  assignments: ItemAssignment[];
}

export interface ItemAssignment {
  userId: string;
  numerator: number;
  resolvedAmount?: number;
}

export interface Expense {
  id: string;
  budgetId: string;
  paidBy: string;
  totalAmount: number;
  description: string;
  expenseDate: string;
  categoryId?: string;
  splitMethod: SplitMethod;
  legs: ExpenseLeg[];
  items?: ExpenseItem[]; // only for BY_ITEM split
  receiptMediaId?: string;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
}

export interface Transfer {
  fromUserId: string;
  fromName: string;
  toUserId: string;
  toName: string;
  amount: number;
}

export interface Settlement {
  budgetId: string;
  transfers: Transfer[];
}

export interface JoinLink {
  token: string;
  budgetId: string;
  joinUrl: string;
  expiresAt: number;
}

export interface JoinLinkPreview {
  budgetId: string;
  currency: string;
  expiresAt: number;
  memberCount: number;
  valid: boolean;
}

export interface JoinAsGuestResult {
  sessionToken: string;
  participantId: string;
  budgetId: string;
  displayName: string;
}

export interface ExpenseComment {
  id: string;
  expenseId: string;
  authorParticipantId: string;
  authorDisplayName: string;
  body: string;
  createdAt: number;
  deleted: boolean;
}

export interface ActivityLogEntry {
  id: string;
  budgetId: string;
  actorParticipantId: string;
  actorDisplayName: string;
  action: string;
  targetType: string;
  targetId: string;
  metadataJson: string;
  createdAt: number;
}

export interface SettlementConfirmation {
  id: string;
  budgetId: string;
  fromParticipantId: string;
  toParticipantId: string;
  amount: number;
  settledAt: string;
  note?: string;
  settledByParticipantId: string;
  createdAt: number;
}

export interface ParticipantInfo {
  participantId: string;
  budgetId: string;
  kind: "MEMBER" | "GUEST" | number;
  displayName: string;
  joinedAt: number;
  lastSeenAt: number;
  revoked: boolean;
  userId?: string;
}

// ---------------------------------------------------------------------------
// Balance (from GetBalances)
// ---------------------------------------------------------------------------

export interface Balance {
  userId: string;
  displayName: string;
  email: string;
  netBalance: number; // positive = owed to this person, negative = owes others
}

// ---------------------------------------------------------------------------
// Raw response shapes
// ---------------------------------------------------------------------------

interface RawBase {
  id?: string;
  created_at?: number;
  updated_at?: number;
  created_by?: string;
}

interface RawExpense {
  base?: RawBase;
  id?: string;
  budget_id: string;
  paid_by: string;
  total_amount: number;
  description: string;
  expense_date: string;
  category_id?: string;
  split_method: number;
  legs?: RawLeg[];
  items?: RawExpenseItem[];
  receipt_media_id?: string;
  created_by?: string;
  created_at?: number;
  updated_at?: number;
}

interface RawLeg {
  user_id: string;
  amount: number;
  weight?: number;
}

interface RawExpenseItem {
  id: string;
  label: string;
  amount: number;
  assignments: RawItemAssignment[];
}

interface RawItemAssignment {
  user_id: string;
  numerator: number;
  resolved_amount?: number;
}

interface RawTransfer {
  from_user_id: string;
  from_name: string;
  to_user_id: string;
  to_name: string;
  amount: number;
}

interface RawSettlement {
  budget_id: string;
  transfers: RawTransfer[];
}

interface RawJoinLink {
  token: string;
  budget_id: string;
  join_url: string;
  expires_at: number;
}

interface RawJoinLinkPreview {
  budget_id: string;
  currency: string;
  expires_at: number;
  member_count: number;
  valid: boolean;
}

interface RawJoinAsGuest {
  session_token: string;
  participant_id: string;
  budget_id: string;
  display_name: string;
}

interface RawComment {
  id: string;
  expense_id: string;
  author_participant_id: string;
  author_display_name: string;
  body: string;
  created_at: number;
  deleted: boolean;
}

interface RawActivityEntry {
  id: string;
  budget_id: string;
  actor_participant_id: string;
  actor_display_name: string;
  action: string;
  target_type: string;
  target_id: string;
  metadata_json: string;
  created_at: number;
}

interface RawSettlementConfirmation {
  id: string;
  budget_id: string;
  from_participant_id: string;
  to_participant_id: string;
  amount: number;
  settled_at: string;
  note?: string;
  settled_by_participant_id: string;
  created_at: number;
}

interface RawParticipant {
  participant_id: string;
  budget_id: string;
  kind: number | string;
  display_name: string;
  joined_at: number;
  last_seen_at: number;
  revoked: boolean;
  user_id?: string;
}

interface RawBalance {
  user_id: string;
  display_name: string;
  email: string;
  net_balance: number;
}

// ---------------------------------------------------------------------------
// Mappers
// ---------------------------------------------------------------------------

const SPLIT_METHOD_MAP: Record<number, SplitMethod> = {
  1: "equal",
  2: "custom",
  3: "weighted",
  4: "percentage",
  5: "by_item",
};

const SPLIT_METHOD_TO_NUM: Record<SplitMethod, number> = {
  equal: 1,
  custom: 2,
  weighted: 3,
  percentage: 4,
  by_item: 5,
};

function toSplitMethod(v: number): SplitMethod {
  return SPLIT_METHOD_MAP[v] ?? "equal";
}

function mapExpense(raw: RawExpense): Expense {
  return {
    id: raw.id ?? raw.base?.id ?? "",
    budgetId: raw.budget_id,
    paidBy: raw.paid_by,
    totalAmount: raw.total_amount,
    description: raw.description,
    expenseDate: raw.expense_date,
    categoryId: raw.category_id || undefined,
    splitMethod: toSplitMethod(raw.split_method),
    legs: (raw.legs ?? []).map((l) => ({
      userId: l.user_id,
      amount: l.amount,
      weight: l.weight,
    })),
    items: (raw.items ?? []).map(mapExpenseItem),
    receiptMediaId: raw.receipt_media_id || undefined,
    createdBy: raw.created_by ?? raw.base?.created_by ?? "",
    createdAt: raw.created_at ?? raw.base?.created_at ?? 0,
    updatedAt: raw.updated_at ?? raw.base?.updated_at ?? 0,
  };
}

function mapExpenseItem(raw: RawExpenseItem): ExpenseItem {
  return {
    id: raw.id,
    label: raw.label,
    amount: raw.amount,
    assignments: (raw.assignments ?? []).map((a) => ({
      userId: a.user_id,
      numerator: a.numerator,
      resolvedAmount: a.resolved_amount,
    })),
  };
}

function mapTransfer(raw: RawTransfer): Transfer {
  return {
    fromUserId: raw.from_user_id,
    fromName: raw.from_name,
    toUserId: raw.to_user_id,
    toName: raw.to_name,
    amount: raw.amount,
  };
}

function mapSettlement(raw: RawSettlement): Settlement {
  return {
    budgetId: raw.budget_id,
    transfers: (raw.transfers ?? []).map(mapTransfer),
  };
}

function mapComment(raw: RawComment): ExpenseComment {
  return {
    id: raw.id,
    expenseId: raw.expense_id,
    authorParticipantId: raw.author_participant_id,
    authorDisplayName: raw.author_display_name,
    body: raw.body,
    createdAt: raw.created_at,
    deleted: raw.deleted,
  };
}

function mapActivityEntry(raw: RawActivityEntry): ActivityLogEntry {
  return {
    id: raw.id,
    budgetId: raw.budget_id,
    actorParticipantId: raw.actor_participant_id,
    actorDisplayName: raw.actor_display_name,
    action: raw.action,
    targetType: raw.target_type,
    targetId: raw.target_id,
    metadataJson: raw.metadata_json,
    createdAt: raw.created_at,
  };
}

function mapParticipant(raw: RawParticipant): ParticipantInfo {
  return {
    participantId: raw.participant_id,
    budgetId: raw.budget_id,
    kind: raw.kind as ParticipantInfo["kind"],
    displayName: raw.display_name,
    joinedAt: raw.joined_at,
    lastSeenAt: raw.last_seen_at,
    revoked: raw.revoked,
    userId: raw.user_id,
  };
}

function mapBalance(raw: RawBalance): Balance {
  return {
    userId: raw.user_id,
    displayName: raw.display_name,
    email: raw.email,
    netBalance: raw.net_balance,
  };
}

// ---------------------------------------------------------------------------
// AddExpense item input (for BY_ITEM split)
// ---------------------------------------------------------------------------

export interface AddExpenseItemInput {
  label: string;
  amount: number;
  assignments: { userId: string; numerator: number }[];
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export const sharingService = {
  // --- Expenses ---

  async listExpenses(budgetId: string): Promise<Expense[]> {
    const raw = await apiClient.get<{ expenses: RawExpense[] }>(
      `${BASE}/budgets/${budgetId}/expenses`
    );
    return (raw.expenses ?? []).map(mapExpense);
  },

  async getExpense(expenseId: string): Promise<Expense> {
    const raw = await apiClient.get<RawExpense>(`${BASE}/expenses/${expenseId}`);
    return mapExpense(raw);
  },

  async addExpense(input: {
    budgetId: string;
    paidBy: string;
    totalAmount: number;
    description: string;
    expenseDate: string;
    categoryId?: string;
    splitMethod: SplitMethod;
    legs: { userId: string; amount: number; weight?: number }[];
    items?: AddExpenseItemInput[];
    receiptMediaId?: string;
  }): Promise<Expense> {
    const splitMethodNum = SPLIT_METHOD_TO_NUM[input.splitMethod];

    // Build legs payload; for percentage the third slot (weight) carries
    // basis-points (0-10000). The UI captures percentages 0-100, so we
    // convert here at the wire boundary.
    const legs = input.legs.map((l) => ({
      user_id: l.userId,
      amount: l.amount,
      weight:
        input.splitMethod === "percentage"
          ? Math.round((l.weight ?? 0) * 100)
          : l.weight ?? 0,
    }));

    // Build items payload; only used for BY_ITEM split
    const items = input.items?.map((it) => ({
      label: it.label,
      amount: it.amount,
      assignments: it.assignments.map((a) => ({
        user_id: a.userId,
        numerator: a.numerator,
      })),
    })) ?? [];

    const raw = await apiClient.post<RawExpense>(
      `${BASE}/budgets/${input.budgetId}/expenses`,
      {
        paid_by: input.paidBy,
        total_amount: input.totalAmount,
        description: input.description,
        expense_date: input.expenseDate,
        category_id: input.categoryId ?? "",
        split_method: splitMethodNum,
        legs,
        items,
        receipt_media_id: input.receiptMediaId ?? "",
      }
    );
    return mapExpense(raw);
  },

  async deleteExpense(expenseId: string): Promise<void> {
    await apiClient.request(`${BASE}/expenses/${expenseId}`, { method: "DELETE" });
  },

  // --- Settlement ---

  async calculateSettlement(budgetId: string): Promise<Settlement> {
    const raw = await apiClient.get<RawSettlement>(
      `${BASE}/budgets/${budgetId}/settlement`
    );
    return mapSettlement(raw);
  },

  async listSettlements(budgetId: string): Promise<SettlementConfirmation[]> {
    const raw = await apiClient.get<{ confirmations: RawSettlementConfirmation[] }>(
      `${BASE}/budgets/${budgetId}/settlements`
    );
    return (raw.confirmations ?? []).map((s) => ({
      id: s.id,
      budgetId: s.budget_id,
      fromParticipantId: s.from_participant_id,
      toParticipantId: s.to_participant_id,
      amount: s.amount,
      settledAt: s.settled_at,
      note: s.note,
      settledByParticipantId: s.settled_by_participant_id,
      createdAt: s.created_at,
    }));
  },

  async markSettled(input: {
    budgetId: string;
    fromParticipantId: string;
    toParticipantId: string;
    amount: number;
    settledAt: string;
    note?: string;
  }): Promise<SettlementConfirmation> {
    const raw = await apiClient.post<RawSettlementConfirmation>(
      `${BASE}/budgets/${input.budgetId}/settlements`,
      {
        from_participant_id: input.fromParticipantId,
        to_participant_id: input.toParticipantId,
        amount: input.amount,
        settled_at: input.settledAt,
        note: input.note,
      }
    );
    return {
      id: raw.id,
      budgetId: raw.budget_id,
      fromParticipantId: raw.from_participant_id,
      toParticipantId: raw.to_participant_id,
      amount: raw.amount,
      settledAt: raw.settled_at,
      note: raw.note,
      settledByParticipantId: raw.settled_by_participant_id,
      createdAt: raw.created_at,
    };
  },

  async deleteSettlement(confirmationId: string): Promise<void> {
    await apiClient.request(`${BASE}/settlements/${confirmationId}`, {
      method: "DELETE",
    });
  },

  // --- Join link (member) ---

  async generateJoinLink(budgetId: string): Promise<JoinLink> {
    const raw = await apiClient.post<RawJoinLink>(
      `${BASE}/budgets/${budgetId}/join-link`,
      {}
    );
    return {
      token: raw.token,
      budgetId: raw.budget_id,
      joinUrl: raw.join_url,
      expiresAt: raw.expires_at,
    };
  },

  // --- Guest join (account-free) ---

  async previewJoinLink(token: string): Promise<JoinLinkPreview> {
    const raw = await apiClient.post<RawJoinLinkPreview>(
      `${BASE}/join-link/preview`,
      { token }
    );
    return {
      budgetId: raw.budget_id,
      currency: raw.currency,
      expiresAt: raw.expires_at,
      memberCount: raw.member_count,
      valid: raw.valid,
    };
  },

  async joinAsGuest(
    token: string,
    displayName: string
  ): Promise<JoinAsGuestResult> {
    const raw = await apiClient.post<RawJoinAsGuest>(
      `${BASE}/join-link/accept-guest`,
      { token, display_name: displayName }
    );
    // Persist the session token keyed by budget_id
    writeSharingSession(raw.budget_id, raw.session_token);
    return {
      sessionToken: raw.session_token,
      participantId: raw.participant_id,
      budgetId: raw.budget_id,
      displayName: raw.display_name,
    };
  },

  // --- Comments ---

  async addComment(
    expenseId: string,
    body: string
  ): Promise<ExpenseComment> {
    const raw = await apiClient.post<{ comment: RawComment }>(
      `${BASE}/expenses/${expenseId}/comments`,
      { body }
    );
    return mapComment(raw.comment);
  },

  async listComments(expenseId: string): Promise<ExpenseComment[]> {
    const raw = await apiClient.get<{ comments: RawComment[] }>(
      `${BASE}/expenses/${expenseId}/comments`
    );
    return (raw.comments ?? []).map(mapComment);
  },

  async deleteComment(commentId: string): Promise<void> {
    await apiClient.request(`${BASE}/comments/${commentId}`, {
      method: "DELETE",
    });
  },

  // --- Activity ---

  async listActivity(input: {
    budgetId: string;
    since?: number;
    limit?: number;
  }): Promise<ActivityLogEntry[]> {
    const qs = new URLSearchParams();
    if (input.since != null) qs.set("since", String(input.since));
    if (input.limit != null) qs.set("limit", String(input.limit));
    const query = qs.toString() ? `?${qs.toString()}` : "";
    const raw = await apiClient.get<{ entries: RawActivityEntry[] }>(
      `${BASE}/budgets/${input.budgetId}/activity${query}`
    );
    return (raw.entries ?? []).map(mapActivityEntry);
  },

  // --- Participants ---

  async listParticipants(budgetId: string): Promise<ParticipantInfo[]> {
    const raw = await apiClient.get<{ participants: RawParticipant[] }>(
      `${BASE}/budgets/${budgetId}/participants`
    );
    return (raw.participants ?? []).map(mapParticipant);
  },

  async revokeParticipant(
    budgetId: string,
    participantId: string
  ): Promise<void> {
    await apiClient.request(
      `${BASE}/budgets/${budgetId}/participants/${participantId}`,
      { method: "DELETE" }
    );
  },

  // --- Balances ---

  async getBalances(budgetId: string): Promise<Balance[]> {
    const raw = await apiClient.get<{ balances: RawBalance[] }>(
      `${BASE}/budgets/${budgetId}/balances`
    );
    return (raw.balances ?? []).map(mapBalance);
  },

  // --- Ownership & roles ---

  /**
   * Transfer budget ownership to another member.
   */
  async transferOwnership(budgetId: string, toUserId: string): Promise<void> {
    await apiClient.request(`${BASE}/budgets/${budgetId}/transfer-ownership`, {
      method: "POST",
      body: { to_user_id: toUserId },
    });
  },

  /**
   * Update a participant's role within a budget.
   */
  async updateMemberRole(
    budgetId: string,
    participantId: string,
    role: "ADMIN" | "MEMBER" | "GUEST"
  ): Promise<void> {
    await apiClient.request(
      `${BASE}/budgets/${budgetId}/participants/${participantId}/role`,
      {
        method: "PATCH",
        body: { role },
      }
    );
  },

  /**
   * Leave a budget (self-removes the current user from the budget).
   */
  async leaveBudget(budgetId: string): Promise<void> {
    await apiClient.request(`${BASE}/budgets/${budgetId}/leave`, {
      method: "POST",
    });
  },
};
