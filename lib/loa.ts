import { prisma } from "@/lib/prisma";
import { SessionUser } from "@/lib/types";

export async function canManageLoa(user: SessionUser) {
  if (user.role === "SLT" || user.role === "ADMIN") return true;
  const authoriser = await (prisma as any).lOAAuthoriser.findUnique({
    where: { tenantId_userId: { tenantId: user.tenantId, userId: user.id } }
  });
  return Boolean(authoriser);
}
