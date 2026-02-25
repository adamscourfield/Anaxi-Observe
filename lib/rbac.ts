import { UserRole } from "@/lib/types";

export const isAdmin = (role: UserRole) => role === "ADMIN";
export const canLead = (role: UserRole) => role === "LEADER" || role === "SLT" || role === "ADMIN";

export type OnCallPermission =
  | "oncall:create"
  | "oncall:acknowledge"
  | "oncall:resolve"
  | "oncall:view_all"
  | "oncall:cancel";

export type StudentPermission =
  | "students:read"
  | "students:write"
  | "import:write";

export type MeetingPermission =
  | "meetings:create"
  | "meetings:view_own"
  | "meetings:view_all"
  | "meetings:edit"
  | "meetings:delete";

export type ActionPermission =
  | "actions:create"
  | "actions:manage"
  | "actions:view_own";

export type AppPermission = OnCallPermission | StudentPermission | MeetingPermission | ActionPermission;

const ROLE_PERMISSIONS: Record<UserRole, AppPermission[]> = {
  ADMIN: [
    "oncall:create", "oncall:acknowledge", "oncall:resolve", "oncall:view_all", "oncall:cancel",
    "import:write", "students:read", "students:write",
    "meetings:create", "meetings:view_own", "meetings:view_all", "meetings:edit", "meetings:delete",
    "actions:create", "actions:manage", "actions:view_own",
  ],
  SLT: [
    "oncall:create", "oncall:acknowledge", "oncall:resolve", "oncall:view_all",
    "import:write", "students:read", "students:write",
    "meetings:create", "meetings:view_all", "meetings:edit",
    "actions:create", "actions:manage", "actions:view_own",
  ],
  LEADER: ["oncall:create", "oncall:cancel", "students:read"],
  TEACHER: [
    "oncall:create", "oncall:cancel", "students:read",
    "meetings:create", "meetings:view_own",
    "actions:create", "actions:manage", "actions:view_own",
  ],
  HR: [
    "oncall:create", "import:write", "students:read",
    "meetings:create", "meetings:view_own",
    "actions:view_own",
  ],
  ON_CALL: [
    "oncall:acknowledge", "oncall:resolve", "oncall:view_all",
    "meetings:view_own",
    "actions:view_own",
  ],
};

export function hasOnCallPermission(role: UserRole, permission: OnCallPermission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function hasPermission(role: UserRole, permission: AppPermission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}
