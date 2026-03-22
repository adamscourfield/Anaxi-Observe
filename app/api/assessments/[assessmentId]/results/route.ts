import { NextResponse } from "next/server";
import { getSessionUserOrThrow } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { upsertSingleResult } from "@/modules/assessments/import";

export async function GET(
  req: Request,
  { params }: { params: { assessmentId: string } }
) {
  const user = await getSessionUserOrThrow();
  const { assessmentId } = params;
  const { searchParams } = new URL(req.url);
  const yearGroup = searchParams.get("yearGroup");
  const status = searchParams.get("status");

  const assessment = await prisma.assessment.findFirst({
    where: { id: assessmentId, tenantId: user.tenantId },
  });
  if (!assessment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const results = await prisma.assessmentResult.findMany({
    where: {
      tenantId: user.tenantId,
      assessmentId,
      ...(status ? { status: status as any } : {}),
      ...(yearGroup
        ? { student: { yearGroup } }
        : {}),
    },
    include: {
      student: {
        select: { id: true, fullName: true, yearGroup: true, upn: true, sendFlag: true, ppFlag: true },
      },
    },
    orderBy: [{ student: { yearGroup: "asc" } }, { student: { fullName: "asc" } }],
  });

  return NextResponse.json({
    assessment,
    results,
    meta: {
      total: results.length,
      present: results.filter((r) => r.status === "PRESENT").length,
      absent: results.filter((r) => r.status === "ABSENT").length,
      withdrawn: results.filter((r) => r.status === "WITHDRAWN").length,
    },
  });
}

export async function POST(
  req: Request,
  { params }: { params: { assessmentId: string } }
) {
  const user = await getSessionUserOrThrow();
  const { assessmentId } = params;

  const assessment = await prisma.assessment.findFirst({
    where: { id: assessmentId, tenantId: user.tenantId },
  });
  if (!assessment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();

  // Support single result or batch
  const entries: Array<{ studentId: string; rawValue: string }> = Array.isArray(body)
    ? body
    : [body];

  if (entries.length === 0) {
    return NextResponse.json({ error: "No entries provided" }, { status: 400 });
  }

  const results = await Promise.all(
    entries.map(({ studentId, rawValue }) =>
      upsertSingleResult({
        tenantId: user.tenantId,
        assessmentId,
        studentId,
        rawValue,
        gradeFormat: assessment.gradeFormat,
        maxScore: assessment.maxScore,
      })
    )
  );

  return NextResponse.json({ results }, { status: 201 });
}
