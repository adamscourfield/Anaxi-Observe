import { getSessionUserOrThrow } from "@/lib/auth";
import { requireRole } from "@/lib/guards";

export async function requireAdminUser() {
  const user = await getSessionUserOrThrow();
  requireRole(user, ["ADMIN"]);
  return user;
}
