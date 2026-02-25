export interface CreateActionInput {
  description: string;
  ownerUserId: string;
  dueDate?: Date;
}

export interface UpdateActionStatusInput {
  status: "OPEN" | "DONE" | "BLOCKED";
  notes?: string;
}

export interface ActionDetail {
  id: string;
  tenantId: string;
  meetingId: string;
  description: string;
  ownerUserId: string;
  owner: { id: string; fullName: string; email: string };
  dueDate?: Date | null;
  status: "OPEN" | "DONE" | "BLOCKED";
  createdByUserId?: string | null;
  createdBy?: { id: string; fullName: string; email: string } | null;
  completedAt?: Date | null;
  completedByUserId?: string | null;
  completedBy?: { id: string; fullName: string } | null;
  createdAt: Date;
  updatedAt: Date;
}

export const ACTION_STATUS_LABELS: Record<"OPEN" | "DONE" | "BLOCKED", string> = {
  OPEN: "Open",
  DONE: "Done",
  BLOCKED: "Blocked",
};
