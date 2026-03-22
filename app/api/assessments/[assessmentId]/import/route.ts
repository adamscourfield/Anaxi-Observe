import { NextResponse } from "next/server";
import { getSessionUserOrThrow } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseAssessmentCsv, computeHeaderSignature } from "@/modules/assessments/csv";
import { importAssessmentResults } from "@/modules/assessments/import";

export async function POST(
  req: Request,
  { params }: { params: { assessmentId: string } }
) {
  const user = await getSessionUserOrThrow();
  const { assessmentId } = params;

  const assessment = await prisma.assessment.findFirst({
    where: { id: assessmentId, tenantId: user.tenantId },
  });
  if (!assessment) {
    return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
  }

  const form = await req.formData();
  const file = form.get("file") as File | null;
  const mappingJsonRaw = String(form.get("mappingJson") || "{}");
  const subjectFilterRaw = String(form.get("subjectFilter") || "");

  if (!file) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }

  const mapping = JSON.parse(mappingJsonRaw) as Record<string, string>;
  const subjectFilter = subjectFilterRaw ? subjectFilterRaw.split(",").map((s) => s.trim()) : undefined;

  const csvText = await file.text();

  // Save column mapping for future auto-detection
  const headerSignature = computeHeaderSignature(csvText);
  if (headerSignature) {
    await prisma.tenantImportMapping.upsert({
      where: {
        // Use a synthetic unique key based on type + signature
        // Falls back to create if not found
        id: `${user.tenantId}-ASSESSMENT_RESULTS-${headerSignature}`.slice(0, 255),
      },
      create: {
        tenantId: user.tenantId,
        type: "ASSESSMENT_RESULTS",
        name: `Auto-saved mapping for ${assessment.title}`,
        mappingJson: mapping,
        headerSignature,
        createdByUserId: user.id,
      },
      update: { mappingJson: mapping },
    }).catch(() => {
      // Non-fatal: mapping save failure shouldn't block import
    });
  }

  // Parse CSV
  const { records, errors } = parseAssessmentCsv(csvText, {
    mapping,
    gradeFormat: assessment.gradeFormat,
    maxScore: assessment.maxScore,
    subjectFilter,
  });

  // If preview-only mode, return without importing
  const previewOnly = form.get("previewOnly") === "true";
  if (previewOnly) {
    return NextResponse.json({
      preview: records.slice(0, 20),
      errors: errors.slice(0, 50),
      totalRecords: records.length,
      totalErrors: errors.length,
    });
  }

  // Run import
  const summary = await importAssessmentResults(records, errors, {
    tenantId: user.tenantId,
    assessmentId,
    gradeFormat: assessment.gradeFormat,
    maxScore: assessment.maxScore,
    uploadedByUserId: user.id,
    fileName: file.name,
  });

  return NextResponse.json({ summary }, { status: 201 });
}
