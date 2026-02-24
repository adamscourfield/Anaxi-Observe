import { prisma } from "@/lib/prisma";
import { SessionUser } from "@/lib/types";

export async function canManageLoa(user: SessionUser, requesterId?: string) {
  if (user.role === "SLT" || user.role === "ADMIN") return true;

  const approver = await (prisma as any).user.findFirst({
    where: { id: user.id, tenantId: user.tenantId },
    select: { canApproveAllLoa: true }
  });
  if (approver?.canApproveAllLoa) return true;

  const globalAuthoriser = await (prisma as any).lOAAuthoriser.findUnique({
    where: { tenantId_userId: { tenantId: user.tenantId, userId: user.id } }
  });
  if (globalAuthoriser) return true;

  if (!requesterId) {
    const scopedAny = await (prisma as any).lOAApprovalScope.findFirst({ where: { tenantId: user.tenantId, approverId: user.id } });
    return Boolean(scopedAny);
  }

  const scoped = await (prisma as any).lOAApprovalScope.findUnique({
    where: { tenantId_approverId_targetUserId: { tenantId: user.tenantId, approverId: user.id, targetUserId: requesterId } }
  });
  return Boolean(scoped);
}

export async function loaManageableRequesterIds(user: SessionUser) {
  if (user.role === "SLT" || user.role === "ADMIN") return null;

  const approver = await (prisma as any).user.findFirst({
    where: { id: user.id, tenantId: user.tenantId },
    select: { canApproveAllLoa: true }
  });
  if (approver?.canApproveAllLoa) return null;

  const globalAuthoriser = await (prisma as any).lOAAuthoriser.findUnique({
    where: { tenantId_userId: { tenantId: user.tenantId, userId: user.id } }
  });
  if (globalAuthoriser) return null;

  const scoped = await (prisma as any).lOAApprovalScope.findMany({
    where: { tenantId: user.tenantId, approverId: user.id },
    select: { targetUserId: true }
  });
  return scoped.map((row: any) => row.targetUserId);
}
