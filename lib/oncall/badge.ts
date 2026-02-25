import { prisma } from "@/lib/prisma";

export async function getOpenOnCallCount(tenantId: string): Promise<number> {
  return (prisma as any).onCallRequest.count({ where: { tenantId, status: "OPEN" } });
}
