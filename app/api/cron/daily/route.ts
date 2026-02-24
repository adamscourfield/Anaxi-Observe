import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserOrThrow } from "@/lib/auth";

export async function POST() {
  const user = await getSessionUserOrThrow();
  const pendingImports = await prisma.importJob.count({ where: { tenantId: user.tenantId, status: "PENDING" } });
  return NextResponse.json({ pendingImports, checkedAt: new Date().toISOString() });
}
