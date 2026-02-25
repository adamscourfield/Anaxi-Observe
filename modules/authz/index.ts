/**
 * Central authorization module for tenant-scoped visibility rules.
 *
 * These helpers operate purely on data (no Prisma imports) so they can be
 * unit-tested without a database connection.
 */

import { UserRole } from "@/lib/types";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ViewerContext = {
  userId: string;
  role: UserRole;
  /** IDs of departments where this user isHeadOfDepartment=true */
  hodDepartmentIds: string[];
  /** IDs of users this viewer coaches */
  coacheeUserIds: string[];
};

export type ObservationRecord = {
  /** The observed teacher's userId */
  observedUserId: string;
  /** The observer's userId (person who conducted the observation) */
  observerUserId: string;
  /** Department IDs associated with the observed teacher */
  observedUserDepartmentIds: string[];
};

export type LeaveRequestRecord = {
  requesterUserId: string;
};

export type LeaveApprovalGroupRecord = {
  appliesTo: "ALL_STAFF" | "SELECTED_MEMBERS";
  approverUserIds: string[];
  /** Only used when appliesTo=SELECTED_MEMBERS */
  subjectUserIds: string[];
};

// ─── Observation Visibility ───────────────────────────────────────────────────

/**
 * Determines whether a viewer can see a given observation.
 *
 * Rules:
 * - ADMIN / SLT → always
 * - Viewer is the observed teacher (own record) → true
 * - Viewer is the observer (conducted the observation) → true
 * - HOD viewing someone in a department they lead → true
 * - Viewer is the coach of the observed teacher → true
 */
export function canViewObservation(
  viewer: ViewerContext,
  observation: ObservationRecord
): boolean {
  if (viewer.role === "ADMIN" || viewer.role === "SLT") return true;

  if (viewer.userId === observation.observedUserId) return true;

  if (viewer.userId === observation.observerUserId) return true;

  if (viewer.role === "HOD") {
    const sharedDept = viewer.hodDepartmentIds.some((deptId) =>
      observation.observedUserDepartmentIds.includes(deptId)
    );
    if (sharedDept) return true;
  }

  if (viewer.coacheeUserIds.includes(observation.observedUserId)) return true;

  return false;
}

// ─── Leave Approval Eligibility ───────────────────────────────────────────────

/**
 * Determines whether an approver can approve a leave request.
 *
 * Rules:
 * - ADMIN → can approve all (no group required)
 * - Other roles: must belong to an approval group that covers the requester:
 *   - appliesTo=ALL_STAFF group → approver membership is sufficient
 *   - appliesTo=SELECTED_MEMBERS group → approver membership + requester in subjectUserIds
 */
export function canApproveLeave(
  approverUserId: string,
  approverRole: UserRole,
  leaveRequest: LeaveRequestRecord,
  groups: LeaveApprovalGroupRecord[]
): boolean {
  if (approverRole === "ADMIN") return true;

  for (const group of groups) {
    if (!group.approverUserIds.includes(approverUserId)) continue;

    if (group.appliesTo === "ALL_STAFF") return true;

    if (
      group.appliesTo === "SELECTED_MEMBERS" &&
      group.subjectUserIds.includes(leaveRequest.requesterUserId)
    ) {
      return true;
    }
  }

  return false;
}
