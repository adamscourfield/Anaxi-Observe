import { NextResponse } from "next/server";
import { getSessionUserOrThrow } from "@/lib/auth";
import { requireFeature } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { parseSubjectTeacherCsv } from "@/modules/students/csv";

export async function POST(req: Request) {
  const user = await getSessionUserOrThrow();
  await requireFeature(user.tenantId, "STUDENTS");

  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "file required" }, { status: 400 });

  const job = await (prisma as any).importJob.create({
    data: {
      tenantId: user.tenantId,
      type: "STUDENT_SUBJECT_TEACHERS",
      status: "PROCESSING",
      uploadedBy: user.id,
      fileName: file.name,
      rowCount: 0
    }
  });

  const rows = parseSubjectTeacherCsv(await file.text());
  const errors: Array<{ rowNumber: number; field: string; message: string }> = [];

  for (const [idx, row] of rows.entries()) {
    const student = await (prisma as any).student.findUnique({ where: { tenantId_upn: { tenantId: user.tenantId, upn: row.UPN } } });
    if (!student) {
      errors.push({ rowNumber: idx + 1, field: "UPN", message: "Student not found" });
      continue;
    }

    const teacher = await (prisma as any).user.findFirst({ where: { tenantId: user.tenantId, email: row.TeacherEmail.toLowerCase() } });
    if (!teacher) {
      errors.push({ rowNumber: idx + 1, field: "TeacherEmail", message: "Teacher not found" });
      continue;
    }

    const subject = await (prisma as any).subject.upsert({
      where: { tenantId_name: { tenantId: user.tenantId, name: row.Subject } },
      create: { tenantId: user.tenantId, name: row.Subject },
      update: {}
    });

    const effectiveFrom = new Date(row.EffectiveFrom);
    const effectiveTo = row.EffectiveTo ? new Date(row.EffectiveTo) : null;

    const overlapping = await (prisma as any).studentSubjectTeacher.findFirst({
      where: {
        tenantId: user.tenantId,
        studentId: student.id,
        subjectId: subject.id,
        OR: [
          { effectiveTo: null },
          { AND: [{ effectiveFrom: { lte: effectiveTo || new Date("9999-12-31") } }, { effectiveTo: { gte: effectiveFrom } }] }
        ]
      }
    });

    if (overlapping) {
      errors.push({ rowNumber: idx + 1, field: "EffectiveFrom", message: "Overlapping mapping exists" });
      continue;
    }

    await (prisma as any).studentSubjectTeacher.create({
      data: { tenantId: user.tenantId, studentId: student.id, subjectId: subject.id, teacherId: teacher.id, effectiveFrom, effectiveTo }
    });
  }

  for (const err of errors) {
    await (prisma as any).importError.create({ data: { importJobId: job.id, rowNumber: err.rowNumber, field: err.field, message: err.message } });
  }

  await (prisma as any).importJob.update({
    where: { id: job.id },
    data: { rowCount: rows.length, status: errors.length ? "FAILED" : "COMPLETED", errorSummary: errors.length ? `${errors.length} errors` : null }
  });

  return NextResponse.json({ importJobId: job.id, rowCount: rows.length, errors });
}
