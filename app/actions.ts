"use server";

import { prisma } from "@/lib/prisma";
import { getSessionUserOrThrow } from "@/lib/auth";
import { requireRole } from "@/lib/guards";

export async function createImportJob(module: string) {
  const user = await getSessionUserOrThrow();
  requireRole(user, ["LEADER", "SLT", "ADMIN"]);
  return prisma.importJob.create({ data: { tenantId: user.tenantId, module, status: "PENDING" } });
}
