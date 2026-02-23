export type UserRole = "TEACHER" | "LEADER" | "SLT" | "ADMIN";
export type FeatureKey = "OBSERVATIONS" | "STUDENTS" | "STUDENTS_IMPORT" | "LEAVE" | "ON_CALL" | "MEETINGS" | "ADMIN";

export type SessionUser = {
  id: string;
  tenantId: string;
  email: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
};
