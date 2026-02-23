import { NextResponse } from "next/server";
import { parseStudentCsv } from "@/modules/students/csv";
import { prisma } from "@/lib/prisma";
import { getSessionUserOrThrow } from "@/lib/auth";

export async function POST(req: Request) {
  const user = await getSessionUserOrThrow();
  const form = await req.formData();
  const csvFile = form.get("file") as File | null;
  const snapshotDateRaw = String(form.get("snapshotDate") || "");
  if (!csvFile || !snapshotDateRaw) {
    return NextResponse.json({ error: "file and snapshotDate are required" }, { status: 400 });
  }

  const text = await csvFile.text();
  const parsed = parseStudentCsv(text);
  const errors: string[] = [];
  parsed.forEach((row, idx) => {
    if (!row.externalId) errors.push(`Row ${idx + 1}: externalId missing`);
  });

  const status = errors.length ? "FAILED" : "COMPLETED";
  await prisma.importJob.create({
    data: {
      tenantId: user.tenantId,
      module: "students",
      status,
      summary: `rows=${parsed.length} snapshotDate=${snapshotDateRaw}`,
      errorText: errors.join("; ") || null,
      finishedAt: new Date()
    }
  });

  return NextResponse.json({ totalRows: parsed.length, preview: parsed.slice(0, 20), errors });
}
