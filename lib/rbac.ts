import { UserRole } from "@/lib/types";

export const isAdmin = (role: UserRole) => role === "ADMIN";
export const canLead = (role: UserRole) => role === "LEADER" || role === "SLT" || role === "ADMIN";

export type OnCallPermission =
  | "oncall:create"
  | "oncall:acknowledge"
  | "oncall:resolve"
  | "oncall:view_all"
  | "oncall:cancel";

const ROLE_PERMISSIONS: Record<UserRole, OnCallPermission[]> = {
  ADMIN: ["oncall:create", "oncall:acknowledge", "oncall:resolve", "oncall:view_all", "oncall:cancel"],
  SLT: ["oncall:create", "oncall:acknowledge", "oncall:resolve", "oncall:view_all"],
  LEADER: ["oncall:create", "oncall:cancel"],
  TEACHER: ["oncall:create", "oncall:cancel"],
  HR: ["oncall:create"],
  ON_CALL: ["oncall:acknowledge", "oncall:resolve", "oncall:view_all"],
};

export function hasOnCallPermission(role: UserRole, permission: OnCallPermission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}
