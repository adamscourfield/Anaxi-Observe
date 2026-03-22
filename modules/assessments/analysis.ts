/**
 * Assessment Cross-Signal Analysis
 *
 * Triangulates academic attainment data against the Student Risk Index (SRI)
 * to surface students who are struggling on both dimensions simultaneously —
 * the highest-priority cohort for pastoral and academic intervention.
 *
 * A student is flagged when:
 *   - Their SRI band is PRIORITY or URGENT, AND
 *   - At least one of their most recent assessment results has a
 *     normalizedScore below the configurable threshold (default 0.5)
 */

import { prisma } from "@/lib/prisma";
import {
  computeStudentRiskIndex,
  type RiskBand,
  type MetricDriver,
  BAND_ORDER,
} from "@/modules/analysis/studentRisk";
import type { GradeFormat } from "@prisma/client";

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_WINDOW_DAYS = 21;
const DEFAULT_ATTAINMENT_THRESHOLD = 0.5;

/** Bands that constitute a behavioural concern for triangulation. */
const CONCERNING_BANDS = new Set<RiskBand>(["PRIORITY", "URGENT"]);

// ─── Types ────────────────────────────────────────────────────────────────────

export type TriangulatedAttainmentResult = {
  subject: string;
  rawValue: string;
  normalizedScore: number | null;
  gradeFormat: GradeFormat;
  maxScore: number | null;
  assessmentTitle: string;
  pointLabel: string;
  pointOrdinal: number;
};

export type TriangulatedStudentRisk = {
  studentId: string;
  studentName: string;
  yearGroup: string | null;
  sendFlag: boolean;
  ppFlag: boolean;
  behaviouralBand: RiskBand;
  behaviouralScore: number;
  behaviouralDrivers: MetricDriver[];
  attainmentResults: TriangulatedAttainmentResult[];
  /** The lowest normalizedScore across all flagged subjects */
  lowestNormalizedScore: number | null;
};

export type TriangulationSummary = {
  students: TriangulatedStudentRisk[];
  computedAt: Date;
  meta: {
    total: number;
    urgent: number;
    priority: number;
    windowDays: number;
    attainmentThreshold: number;
  };
};

// ─── Main function ────────────────────────────────────────────────────────────

export async function computeTriangulatedRisks(
  tenantId: string,
  viewerUserId: string,
  windowDays: number = DEFAULT_WINDOW_DAYS,
  attainmentThreshold: number = DEFAULT_ATTAINMENT_THRESHOLD
): Promise<TriangulationSummary> {
  // Step 1: compute SRI for all students
  const { rows: sriRows } = await computeStudentRiskIndex(
    tenantId,
    windowDays,
    viewerUserId
  );

  // Step 2: filter to behaviourally concerning students
  const concerningStudentIds = sriRows
    .filter((r) => CONCERNING_BANDS.has(r.band))
    .map((r) => r.studentId);

  if (concerningStudentIds.length === 0) {
    return {
      students: [],
      computedAt: new Date(),
      meta: { total: 0, urgent: 0, priority: 0, windowDays, attainmentThreshold },
    };
  }

  // Step 3: fetch most recent assessment results per student from the active cycle
  const activeCycle = await prisma.assessmentCycle.findFirst({
    where: { tenantId, isActive: true },
    select: { id: true },
  });

  if (!activeCycle) {
    return {
      students: [],
      computedAt: new Date(),
      meta: { total: 0, urgent: 0, priority: 0, windowDays, attainmentThreshold },
    };
  }

  const allResults = await prisma.assessmentResult.findMany({
    where: {
      tenantId,
      studentId: { in: concerningStudentIds },
      status: "PRESENT",
      assessment: {
        point: { cycleId: activeCycle.id },
      },
    },
    include: {
      assessment: {
        include: { point: true },
      },
    },
    orderBy: { assessment: { point: { ordinal: "desc" } } },
  });

  // Step 4: per student, keep only the most recent result per subject
  type ResultRow = typeof allResults[number];
  const latestPerStudentSubject = new Map<string, ResultRow>();

  for (const result of allResults) {
    const key = `${result.studentId}::${result.assessment.subject}`;
    if (!latestPerStudentSubject.has(key)) {
      latestPerStudentSubject.set(key, result);
    }
  }

  // Step 5: group by student and check if any result is below threshold
  const resultsByStudent = new Map<string, ResultRow[]>();
  for (const result of latestPerStudentSubject.values()) {
    const list = resultsByStudent.get(result.studentId) ?? [];
    list.push(result);
    resultsByStudent.set(result.studentId, list);
  }

  // Step 6: build output — only include students with at least one low score
  const sriByStudentId = new Map(sriRows.map((r) => [r.studentId, r]));
  const triangulated: TriangulatedStudentRisk[] = [];

  for (const [studentId, results] of resultsByStudent.entries()) {
    const belowThreshold = results.filter(
      (r) => r.normalizedScore !== null && r.normalizedScore < attainmentThreshold
    );
    if (belowThreshold.length === 0) continue;

    const sri = sriByStudentId.get(studentId);
    if (!sri) continue;

    const attainmentResults: TriangulatedAttainmentResult[] = results.map((r) => ({
      subject: r.assessment.subject,
      rawValue: r.rawValue,
      normalizedScore: r.normalizedScore,
      gradeFormat: r.assessment.gradeFormat,
      maxScore: r.assessment.maxScore,
      assessmentTitle: r.assessment.title,
      pointLabel: r.assessment.point.label,
      pointOrdinal: r.assessment.point.ordinal,
    }));

    // Sort by normalizedScore ascending (most concerning first)
    attainmentResults.sort(
      (a, b) => (a.normalizedScore ?? 1) - (b.normalizedScore ?? 1)
    );

    const scores = attainmentResults
      .map((r) => r.normalizedScore)
      .filter((s): s is number => s !== null);

    triangulated.push({
      studentId,
      studentName: sri.studentName,
      yearGroup: sri.yearGroup,
      sendFlag: sri.sendFlag,
      ppFlag: sri.ppFlag,
      behaviouralBand: sri.band,
      behaviouralScore: sri.riskScore,
      behaviouralDrivers: sri.drivers,
      attainmentResults,
      lowestNormalizedScore: scores.length > 0 ? Math.min(...scores) : null,
    });
  }

  // Step 7: sort — most urgent behavioural band first, then lowest attainment
  triangulated.sort((a, b) => {
    const bandDiff = BAND_ORDER[a.behaviouralBand] - BAND_ORDER[b.behaviouralBand];
    if (bandDiff !== 0) return bandDiff;
    return (a.lowestNormalizedScore ?? 1) - (b.lowestNormalizedScore ?? 1);
  });

  return {
    students: triangulated,
    computedAt: new Date(),
    meta: {
      total: triangulated.length,
      urgent: triangulated.filter((s) => s.behaviouralBand === "URGENT").length,
      priority: triangulated.filter((s) => s.behaviouralBand === "PRIORITY").length,
      windowDays,
      attainmentThreshold,
    },
  };
}
