/**
 * Assessment Metrics Engine
 *
 * Computes attainment metrics from AssessmentResult data:
 *   - Threshold metrics: % of students at or above a grade threshold
 *   - Combined metrics: % meeting criteria across multiple subjects
 *   - Progress deltas: change in normalizedScore across assessment points
 *   - Dimension aggregations: breakdown by yearGroup, teacher, subject
 */

import { prisma } from "@/lib/prisma";
import { normalizeThreshold } from "./gradeNormalizer";
import type { GradeFormat } from "@prisma/client";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ThresholdMetricResult = {
  assessmentId: string;
  subject: string;
  yearGroup: string;
  gradeFormat: GradeFormat;
  threshold: string;
  normalizedThreshold: number;
  totalStudents: number;
  presentStudents: number;
  aboveThreshold: number;
  pctAboveThreshold: number;
  /** Student IDs at or above threshold */
  studentIds: string[];
};

export type MetricRule = {
  subject: string;
  threshold: string;
  gradeFormat: GradeFormat;
  maxScore?: number | null;
  operator: "gte" | "gt" | "lte" | "lt";
};

export type CombinedMetricResult = {
  presetName?: string;
  logic: "AND" | "OR";
  rules: MetricRule[];
  totalStudents: number;
  meetingAllRules: number;
  pctMeetingAllRules: number;
  /** Student IDs meeting the combined criteria */
  studentIds: string[];
  /** Per-rule breakdown */
  ruleBreakdown: Array<{
    rule: MetricRule;
    studentIds: string[];
    count: number;
    pct: number;
  }>;
};

export type ProgressPoint = {
  pointId: string;
  pointLabel: string;
  assessedAt: Date;
  ordinal: number;
  normalizedScore: number | null;
  rawValue: string | null;
};

export type StudentProgressResult = {
  studentId: string;
  studentName: string;
  subject: string;
  points: ProgressPoint[];
  delta: number | null; // last - first normalizedScore
};

export type DimensionAggregation = {
  dimension: string;
  value: string;
  totalStudents: number;
  presentStudents: number;
  meanNormalizedScore: number | null;
  aboveThreshold: number | null;
  pctAboveThreshold: number | null;
};

// ─── Threshold metric ─────────────────────────────────────────────────────────

/**
 * Compute the % of students at or above a grade threshold for a given assessment.
 */
export async function computeThresholdMetric(
  tenantId: string,
  assessmentId: string,
  threshold: string,
  operator: "gte" | "gt" | "lte" | "lt" = "gte"
): Promise<ThresholdMetricResult | null> {
  const assessment = await prisma.assessment.findFirst({
    where: { id: assessmentId, tenantId },
    include: { results: { where: { tenantId } } },
  });
  if (!assessment) return null;

  const normalizedThreshold = normalizeThreshold(
    threshold,
    assessment.gradeFormat,
    assessment.maxScore
  );
  if (normalizedThreshold === null) return null;

  const present = assessment.results.filter((r) => r.status === "PRESENT");
  const aboveList = present.filter((r) => {
    if (r.normalizedScore === null) return false;
    switch (operator) {
      case "gte": return r.normalizedScore >= normalizedThreshold;
      case "gt":  return r.normalizedScore > normalizedThreshold;
      case "lte": return r.normalizedScore <= normalizedThreshold;
      case "lt":  return r.normalizedScore < normalizedThreshold;
    }
  });

  return {
    assessmentId,
    subject: assessment.subject,
    yearGroup: assessment.yearGroup,
    gradeFormat: assessment.gradeFormat,
    threshold,
    normalizedThreshold,
    totalStudents: assessment.results.length,
    presentStudents: present.length,
    aboveThreshold: aboveList.length,
    pctAboveThreshold:
      present.length > 0
        ? Math.round((aboveList.length / present.length) * 1000) / 10
        : 0,
    studentIds: aboveList.map((r) => r.studentId),
  };
}

// ─── Combined metric ──────────────────────────────────────────────────────────

/**
 * Compute % of students meeting criteria across multiple subjects within
 * a single assessment point. Logic is AND (must meet all) or OR (any one).
 */
export async function computeCombinedMetric(
  tenantId: string,
  pointId: string,
  rules: MetricRule[],
  logic: "AND" | "OR" = "AND",
  presetName?: string
): Promise<CombinedMetricResult | null> {
  if (rules.length === 0) return null;

  // Fetch all assessments for this point
  const assessments = await prisma.assessment.findMany({
    where: { tenantId, pointId },
    include: { results: { where: { tenantId, status: "PRESENT" } } },
  });

  const assessmentBySubject = new Map(assessments.map((a) => [a.subject, a]));

  // Compute per-rule student sets
  const ruleBreakdown: CombinedMetricResult["ruleBreakdown"] = [];
  const ruleStudentSets: Set<string>[] = [];
  let allStudentIds: Set<string> | null = null;

  for (const rule of rules) {
    const assessment = assessmentBySubject.get(rule.subject);
    if (!assessment) {
      ruleStudentSets.push(new Set());
      ruleBreakdown.push({ rule, studentIds: [], count: 0, pct: 0 });
      continue;
    }

    const threshold = normalizeThreshold(rule.threshold, rule.gradeFormat, rule.maxScore);
    if (threshold === null) {
      ruleStudentSets.push(new Set());
      ruleBreakdown.push({ rule, studentIds: [], count: 0, pct: 0 });
      continue;
    }

    const matching = assessment.results.filter((r) => {
      if (r.normalizedScore === null) return false;
      switch (rule.operator) {
        case "gte": return r.normalizedScore >= threshold;
        case "gt":  return r.normalizedScore > threshold;
        case "lte": return r.normalizedScore <= threshold;
        case "lt":  return r.normalizedScore < threshold;
      }
    });

    const matchingIds = new Set(matching.map((r) => r.studentId));
    ruleStudentSets.push(matchingIds);

    // Track all students seen (union)
    if (allStudentIds === null) {
      allStudentIds = new Set(assessment.results.map((r) => r.studentId));
    } else {
      for (const id of assessment.results.map((r) => r.studentId)) {
        allStudentIds.add(id);
      }
    }

    ruleBreakdown.push({
      rule,
      studentIds: [...matchingIds],
      count: matchingIds.size,
      pct:
        assessment.results.length > 0
          ? Math.round((matchingIds.size / assessment.results.length) * 1000) / 10
          : 0,
    });
  }

  const totalStudents = allStudentIds ? allStudentIds.size : 0;

  // Combine sets
  let combinedIds: Set<string>;
  if (logic === "AND") {
    if (ruleStudentSets.length === 0) {
      combinedIds = new Set();
    } else {
      combinedIds = ruleStudentSets[0];
      for (let i = 1; i < ruleStudentSets.length; i++) {
        combinedIds = new Set([...combinedIds].filter((id) => ruleStudentSets[i].has(id)));
      }
    }
  } else {
    combinedIds = new Set(ruleStudentSets.flatMap((s) => [...s]));
  }

  return {
    presetName,
    logic,
    rules,
    totalStudents,
    meetingAllRules: combinedIds.size,
    pctMeetingAllRules:
      totalStudents > 0
        ? Math.round((combinedIds.size / totalStudents) * 1000) / 10
        : 0,
    studentIds: [...combinedIds],
    ruleBreakdown,
  };
}

// ─── Progress delta ───────────────────────────────────────────────────────────

/**
 * Show a student's normalizedScore across multiple assessment points for a subject.
 */
export async function computeStudentProgress(
  tenantId: string,
  studentId: string,
  subject: string,
  cycleId?: string
): Promise<StudentProgressResult | null> {
  const student = await prisma.student.findFirst({
    where: { id: studentId, tenantId },
    select: { fullName: true },
  });
  if (!student) return null;

  const results = await prisma.assessmentResult.findMany({
    where: { tenantId, studentId },
    include: {
      assessment: {
        include: {
          point: true,
        },
      },
    },
    orderBy: { assessment: { point: { ordinal: "asc" } } },
  });

  const subjectResults = results.filter(
    (r) =>
      r.assessment.subject === subject &&
      (!cycleId || r.assessment.point.cycleId === cycleId)
  );

  const points: ProgressPoint[] = subjectResults.map((r) => ({
    pointId: r.assessment.pointId,
    pointLabel: r.assessment.point.label,
    assessedAt: r.assessment.point.assessedAt,
    ordinal: r.assessment.point.ordinal,
    normalizedScore: r.normalizedScore,
    rawValue: r.rawValue,
  }));

  const scores = points.map((p) => p.normalizedScore).filter((s): s is number => s !== null);
  const delta =
    scores.length >= 2 ? scores[scores.length - 1] - scores[0] : null;

  return { studentId, studentName: student.fullName, subject, points, delta };
}

// ─── Dimension aggregation ────────────────────────────────────────────────────

export type AggregationDimension = "yearGroup" | "subject" | "teacher";

/**
 * Aggregate assessment results by a given dimension.
 * For "teacher" dimension, joins via StudentSubjectTeacher.
 */
export async function aggregateByDimension(
  tenantId: string,
  assessmentId: string,
  dimension: AggregationDimension,
  threshold?: string
): Promise<DimensionAggregation[]> {
  // First fetch the assessment metadata (needed for subject filter in teacher dimension)
  const assessmentMeta = await prisma.assessment.findFirst({
    where: { id: assessmentId, tenantId },
    select: { subject: true, gradeFormat: true, maxScore: true },
  });
  if (!assessmentMeta) return [];

  const assessment = await prisma.assessment.findFirst({
    where: { id: assessmentId, tenantId },
    include: {
      results: {
        where: { tenantId },
        include: {
          student: {
            include: {
              subjectTeachers: {
                where: {
                  tenantId,
                  subject: { name: assessmentMeta.subject },
                  effectiveTo: null,
                },
                include: { teacher: { select: { fullName: true, id: true } } },
                take: 1,
              },
            },
          },
        },
      },
    },
  });
  if (!assessment) return [];

  const normalizedThreshold =
    threshold !== undefined
      ? normalizeThreshold(threshold, assessment.gradeFormat, assessment.maxScore)
      : null;

  // Group results by dimension value
  const groups = new Map<string, typeof assessment.results>();

  for (const result of assessment.results) {
    let key: string;

    if (dimension === "yearGroup") {
      key = result.student.yearGroup ?? "Unknown";
    } else if (dimension === "subject") {
      key = assessment.subject;
    } else {
      // teacher
      const teacher = result.student.subjectTeachers[0]?.teacher;
      key = teacher ? teacher.fullName : "Unassigned";
    }

    const group = groups.get(key) ?? [];
    group.push(result);
    groups.set(key, group);
  }

  return [...groups.entries()].map(([value, results]) => {
    const present = results.filter((r) => r.status === "PRESENT");
    const scores = present
      .map((r) => r.normalizedScore)
      .filter((s): s is number => s !== null);
    const mean = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;

    const above =
      normalizedThreshold !== null
        ? present.filter(
            (r) => r.normalizedScore !== null && r.normalizedScore >= normalizedThreshold
          ).length
        : null;

    return {
      dimension,
      value,
      totalStudents: results.length,
      presentStudents: present.length,
      meanNormalizedScore: mean,
      aboveThreshold: above,
      pctAboveThreshold:
        above !== null && present.length > 0
          ? Math.round((above / present.length) * 1000) / 10
          : null,
    };
  });
}

// ─── Whole-cycle summary ──────────────────────────────────────────────────────

export type CycleSummary = {
  cycleId: string;
  cycleLabel: string;
  totalAssessments: number;
  totalResults: number;
  subjectSummaries: Array<{
    subject: string;
    yearGroup: string;
    assessmentCount: number;
    latestMeanScore: number | null;
  }>;
};

export async function computeCycleSummary(
  tenantId: string,
  cycleId: string
): Promise<CycleSummary | null> {
  const cycle = await prisma.assessmentCycle.findFirst({
    where: { id: cycleId, tenantId },
    include: {
      points: {
        include: {
          assessments: {
            include: {
              results: {
                where: { tenantId, status: "PRESENT" },
                select: { normalizedScore: true },
              },
            },
          },
        },
        orderBy: { ordinal: "desc" },
      },
    },
  });
  if (!cycle) return null;

  // Group by subject+yearGroup, take latest point's data
  const subjectMap = new Map<string, { count: number; scores: number[] }>();

  for (const point of cycle.points) {
    for (const assessment of point.assessments) {
      const key = `${assessment.subject}::${assessment.yearGroup}`;
      if (!subjectMap.has(key)) {
        const scores = assessment.results
          .map((r) => r.normalizedScore)
          .filter((s): s is number => s !== null);
        subjectMap.set(key, { count: 1, scores });
      } else {
        subjectMap.get(key)!.count++;
      }
    }
  }

  const totalResults = cycle.points
    .flatMap((p) => p.assessments)
    .reduce((sum, a) => sum + a.results.length, 0);

  const subjectSummaries = [...subjectMap.entries()].map(([key, data]) => {
    const [subject, yearGroup] = key.split("::");
    const mean =
      data.scores.length > 0
        ? data.scores.reduce((a, b) => a + b, 0) / data.scores.length
        : null;
    return {
      subject,
      yearGroup,
      assessmentCount: data.count,
      latestMeanScore: mean,
    };
  });

  return {
    cycleId,
    cycleLabel: cycle.label,
    totalAssessments: cycle.points.flatMap((p) => p.assessments).length,
    totalResults,
    subjectSummaries,
  };
}
