import { UserRole } from "@/lib/types";

export const isAdmin = (role: UserRole) => role === "ADMIN";
export const canLead = (role: UserRole) => role === "LEADER" || role === "SLT" || role === "ADMIN";
