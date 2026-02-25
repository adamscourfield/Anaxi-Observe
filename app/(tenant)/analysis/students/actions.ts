"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSessionUserOrThrow } from "@/lib/auth";
import { canViewStudentAnalysis } from "@/modules/authz";

export async function toggleWatchlist(studentId: string): Promise<{ onWatchlist: boolean }> {
  const user = await getSessionUserOrThrow();

  // RBAC: same rules as viewing
  const canView = canViewStudentAnalysis({
    userId: user.id,
    role: user.role,
    hodDepartmentIds: [],
    coacheeUserIds: [],
  });
  if (!canView) throw new Error("FORBIDDEN");

  const existing = await (prisma as any).studentWatchlist.findUnique({
    where: {
      tenantId_studentId_createdByUserId: {
        tenantId: user.tenantId,
        studentId,
        createdByUserId: user.id,
      },
    },
  });

  if (existing) {
    await (prisma as any).studentWatchlist.delete({ where: { id: existing.id } });
    revalidatePath("/analysis/students");
    return { onWatchlist: false };
  } else {
    await (prisma as any).studentWatchlist.create({
      data: {
        tenantId: user.tenantId,
        studentId,
        createdByUserId: user.id,
      },
    });
    revalidatePath("/analysis/students");
    return { onWatchlist: true };
  }
}
