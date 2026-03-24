/**
 * Ad-hoc Assessment Results API
 *
 * Accepts a batch of manually-entered results keyed by student name rather than
 * UPN. For each entry the handler will:
 *   1. Try to match an existing student by full name (case-insensitive).
 *   2. If no match, create a new student record with just the name.
 *   3. Upsert the AssessmentResult.
 *
 * POST /api/assessments/adhoc-results
 * Body: {
 *   assessmentId: string;
 *   rows: Array<{ studentName: string; yearGroup?: string; rawValue: string }>;
 * }
 */

import { NextResponse } from "next/server";
import { getSessionUserOrThrow } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizeGrade, detectNonGradeStatus } from "@/modules/assessments/gradeNormalizer";

export async function POST(req: Request) {
  const user = await getSessionUserOrThrow();

  const body = await req.json();
  const { assessmentId, rows } = body as {
    assessmentId: string;
    rows: Array<{ studentName: string; yearGroup?: string; rawValue: string }>;
  };

  if (!assessmentId || !Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json(
      { error: "assessmentId and a non-empty rows array are required" },
      { status: 400 }
    );
  }

  // Verify assessment belongs to this tenant
  const assessment = await prisma.assessment.findFirst({
    where: { id: assessmentId, tenantId: user.tenantId },
  });
  if (!assessment) {
    return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
  }

  let saved = 0;
  const errors: Array<{ rowIndex: number; studentName: string; message: string }> = [];

  for (let i = 0; i < rows.length; i++) {
    const { studentName, yearGroup, rawValue } = rows[i];

    if (!studentName?.trim() || !rawValue?.trim()) {
      errors.push({ rowIndex: i, studentName: studentName ?? "", message: "Name and grade are required" });
      continue;
    }

    // Validate the grade value (unless it's an absent/withdrawn marker)
    const nonGradeStatus = detectNonGradeStatus(rawValue);
    if (!nonGradeStatus) {
      const norm = normalizeGrade(rawValue, assessment.gradeFormat, assessment.maxScore);
      if (norm === null) {
        errors.push({
          rowIndex: i,
          studentName,
          message: `"${rawValue}" is not a valid ${assessment.gradeFormat} grade`,
        });
        continue;
      }
    }

    // Find or create student by name
    let student = await prisma.student.findFirst({
      where: {
        tenantId: user.tenantId,
        fullName: { equals: studentName.trim(), mode: "insensitive" },
      },
      select: { id: true },
    });

    if (!student) {
      student = await prisma.student.create({
        data: {
          tenantId: user.tenantId,
          fullName: studentName.trim(),
          yearGroup: yearGroup?.trim() || null,
        },
        select: { id: true },
      });
    }

    // Upsert the result
    try {
      const status = nonGradeStatus ?? "PRESENT";
      const normalizedScore = nonGradeStatus
        ? null
        : normalizeGrade(rawValue, assessment.gradeFormat, assessment.maxScore);

      await prisma.assessmentResult.upsert({
        where: {
          tenantId_assessmentId_studentId: {
            tenantId: user.tenantId,
            assessmentId,
            studentId: student.id,
          },
        },
        update: { rawValue: rawValue.trim(), normalizedScore, status, updatedAt: new Date() },
        create: {
          tenantId: user.tenantId,
          assessmentId,
          studentId: student.id,
          rawValue: rawValue.trim(),
          normalizedScore,
          status,
        },
      });
      saved++;
    } catch (err) {
      errors.push({
        rowIndex: i,
        studentName,
        message: err instanceof Error ? err.message : "Failed to save result",
      });
    }
  }

  return NextResponse.json({ saved, errors }, { status: 201 });
}
