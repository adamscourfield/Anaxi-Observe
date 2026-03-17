import Link from "next/link";
import { notFound } from "next/navigation";
import { getSessionUserOrThrow } from "@/lib/auth";
import { requireFeature } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { SectionHeader } from "@/components/ui/section-header";
import { StatusPill, type PillVariant } from "@/components/ui/status-pill";
import { MetaText } from "@/components/ui/typography";
import { Avatar } from "@/components/ui/avatar";
import { SIGNAL_DEFINITIONS } from "@/modules/observations/signalDefinitions";
import { formatPhaseLabel } from "@/modules/observations/phaseLabel";
import {
  canViewExplorer,
  canExportExplorer,
  canViewBehaviourExplorer,
} from "@/modules/authz";
import { computeTeacherPivot, computeTeacherRiskIndex, RiskStatus } from "@/modules/analysis/teacherRisk";
import type { TeacherRiskRow } from "@/modules/analysis/teacherRisk";
import { computeDepartmentPivot } from "@/modules/analysis/departmentPivot";
import { computeStudentRiskIndex, RiskBand, BAND_ORDER } from "@/modules/analysis/studentRisk";
import { computeCohortPivot } from "@/modules/analysis/cohortPivot";
import { computeCpdPriorities, getTopImprovingSignals } from "@/modules/analysis/cpdPriorities";
import type { CpdPriorityRow } from "@/modules/analysis/cpdPriorities";

const WINDOW_OPTIONS = [7, 21, 28] as const;
type WindowDays = (typeof WINDOW_OPTIONS)[number];

const VIEW_MODES = [
  "INSTRUCTION_TEACHERS_PIVOT",
  "INSTRUCTION_DEPARTMENTS_PIVOT",
  "INSTRUCTION_LIST",
  "TEACHER_PRIORITIES",
  "CPD_SIGNALS",
  "BEHAVIOUR_STUDENTS_TABLE",
  "BEHAVIOUR_COHORTS_PIVOT",
] as const;
type ViewMode = (typeof VIEW_MODES)[number];

const VIEW_LABELS: Record<ViewMode, string> = {
  INSTRUCTION_TEACHERS_PIVOT: "Teachers pivot",
  INSTRUCTION_DEPARTMENTS_PIVOT: "Departments pivot",
  INSTRUCTION_LIST: "Observation list",
  TEACHER_PRIORITIES: "Teacher priorities",
  CPD_SIGNALS: "CPD signals",
  BEHAVIOUR_STUDENTS_TABLE: "Students",
  BEHAVIOUR_COHORTS_PIVOT: "Cohorts",
};

const STATUS_LABELS: Record<RiskStatus, string> = {
  SIGNIFICANT_DRIFT: "Significant",
  EMERGING_DRIFT: "Emerging",
  STABLE: "Stable",
  LOW_COVERAGE: "Low coverage",
};

const STATUS_VARIANT: Record<RiskStatus, PillVariant> = {
  SIGNIFICANT_DRIFT: "error",
  EMERGING_DRIFT: "warning",
  STABLE: "success",
  LOW_COVERAGE: "neutral",
};

const BAND_LABELS: Record<RiskBand, string> = {
  URGENT: "Urgent",
  PRIORITY: "Priority",
  WATCH: "Watch",
  STABLE: "Stable",
};

const BAND_VARIANT: Record<RiskBand, PillVariant> = {
  URGENT: "error",
  PRIORITY: "warning",
  WATCH: "info",
  STABLE: "success",
};

function deltaClass(delta: number | null): string {
  if (delta === null) return "text-muted";
  if (delta < 0) return "text-amber-600";
  if (delta > 0) return "text-green-600";
  return "text-muted";
}

function fmtDelta(val: number | null, decimals = 2): string {
  if (val === null) return "—";
  return `${val > 0 ? "+" : ""}${val.toFixed(decimals)}`;
}

/** Visual threshold for signal-cell accent treatment */
const VISUAL_THRESHOLD = 0.15;

function pivotCellClass(delta: number | null, density: "comfortable" | "compact"): string {
  const pad = density === "compact" ? "px-2 py-1.5" : "px-3 py-3";
  if (delta !== null && delta < -VISUAL_THRESHOLD) {
    return `${pad} tabular-nums border-l-2 border-amber-300 bg-amber-50/40`;
  }
  return `${pad} tabular-nums`;
}

function pivotCellTooltip(
  label: string,
  cell: { currentMean: number | null; prevMean: number | null; delta: number | null; coverageCount: number },
  windowDays: number,
  computedAt: string
): string {
  return [
    label,
    `Current: ${cell.currentMean !== null ? cell.currentMean.toFixed(2) : "—"}`,
    `Previous: ${cell.prevMean !== null ? cell.prevMean.toFixed(2) : "—"}`,
    `Δ ${cell.delta !== null ? (cell.delta > 0 ? "+" : "") + cell.delta.toFixed(2) : "—"}`,
    `Coverage: ${cell.coverageCount}`,
    `Window: ${windowDays}d · ${computedAt}`,
  ].join("\n");
}

export default async function ExplorerPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const user = await getSessionUserOrThrow();
  await requireFeature(user.tenantId, "ANALYSIS");

  // Build viewer context
  const [hodMemberships, coachAssignments] = await Promise.all([
    (prisma as any).departmentMembership.findMany({
      where: { userId: user.id, isHeadOfDepartment: true },
    }),
    (prisma as any).coachAssignment.findMany({ where: { coachUserId: user.id } }),
  ]);

  const hodDepartmentIds = (hodMemberships as any[]).map((m: any) => m.departmentId);
  const coacheeUserIds = (coachAssignments as any[]).map((a: any) => a.coacheeUserId);
  const viewerContext = { userId: user.id, role: user.role, hodDepartmentIds, coacheeUserIds };

  if (!canViewExplorer(viewerContext)) notFound();

  const canExport = canExportExplorer(viewerContext);
  const canSeeBehaviour = canViewBehaviourExplorer(viewerContext);

  // Parse query params
  const rawWindow = Number(searchParams?.windowDays ?? searchParams?.window ?? "21");
  const windowDays: WindowDays = WINDOW_OPTIONS.includes(rawWindow as WindowDays)
    ? (rawWindow as WindowDays)
    : 21;

  const rawView = typeof searchParams?.view === "string" ? searchParams.view : "INSTRUCTION_TEACHERS_PIVOT";
  const view: ViewMode = (VIEW_MODES as readonly string[]).includes(rawView)
    ? (rawView as ViewMode)
    : "INSTRUCTION_TEACHERS_PIVOT";

  const filterDepartmentId = typeof searchParams?.departmentId === "string" ? searchParams.departmentId : "";
  const filterTeacherId = typeof searchParams?.teacherMembershipId === "string" ? searchParams.teacherMembershipId : "";
  const filterYearGroup = typeof searchParams?.yearGroup === "string" ? searchParams.yearGroup : "";
  const filterSubject = typeof searchParams?.subject === "string" ? searchParams.subject : "";
  const studentSearch = typeof searchParams?.studentSearch === "string" ? searchParams.studentSearch : "";
  const densityRaw = typeof searchParams?.density === "string" ? searchParams.density : "comfortable";
  const density: "comfortable" | "compact" = densityRaw === "compact" ? "compact" : "comfortable";
  const sortSignal = typeof searchParams?.sortSignal === "string" ? searchParams.sortSignal : "";
  const sortDir: "asc" | "desc" = typeof searchParams?.sortDir === "string" && searchParams.sortDir === "asc" ? "asc" : "desc";

  // Load reference data for filters
  const [departments, settings] = await Promise.all([
    (prisma as any).department.findMany({
      where: { tenantId: user.tenantId },
      orderBy: { name: "asc" },
    }),
    (prisma as any).tenantSettings.findUnique({ where: { tenantId: user.tenantId } }),
  ]);

  // Check if behaviour views are blocked for current view
  const isBehaviourView = view === "BEHAVIOUR_STUDENTS_TABLE" || view === "BEHAVIOUR_COHORTS_PIVOT";
  if (isBehaviourView && !canSeeBehaviour) notFound();

  // ─── Fetch data for the current view ────────────────────────────────────────

  let computedAt = new Date();
  let teacherPivotRows: Awaited<ReturnType<typeof computeTeacherPivot>>["rows"] = [];
  let deptPivotRows: Awaited<ReturnType<typeof computeDepartmentPivot>>["rows"] = [];
  let studentRows: Awaited<ReturnType<typeof computeStudentRiskIndex>>["rows"] = [];
  let cohortRows: Awaited<ReturnType<typeof computeCohortPivot>>["rows"] = [];
  let observationList: any[] = [];
  let teacherRiskRows: TeacherRiskRow[] = [];
  let cpdRows: CpdPriorityRow[] = [];
  let cpdImprovingRows: CpdPriorityRow[] = [];

  if (view === "INSTRUCTION_TEACHERS_PIVOT") {
    const result = await computeTeacherPivot(user.tenantId, windowDays);
    teacherPivotRows = result.rows;
    computedAt = result.computedAt;

    // Apply HOD scope filter
    if (user.role === "HOD" && hodDepartmentIds.length > 0) {
      const deptTeacherMemberships = await (prisma as any).departmentMembership.findMany({
        where: { tenantId: user.tenantId, departmentId: { in: hodDepartmentIds } },
      });
      const allowedTeacherIds = new Set((deptTeacherMemberships as any[]).map((m: any) => m.userId));
      teacherPivotRows = teacherPivotRows.filter((r) => allowedTeacherIds.has(r.teacherMembershipId));
    }
    if (filterDepartmentId) {
      const deptMembers = await (prisma as any).departmentMembership.findMany({
        where: { tenantId: user.tenantId, departmentId: filterDepartmentId },
      });
      const ids = new Set((deptMembers as any[]).map((m: any) => m.userId));
      teacherPivotRows = teacherPivotRows.filter((r) => ids.has(r.teacherMembershipId));
    }
  } else if (view === "INSTRUCTION_DEPARTMENTS_PIVOT") {
    const filterIds = user.role === "HOD" && hodDepartmentIds.length > 0 ? hodDepartmentIds : undefined;
    const result = await computeDepartmentPivot(user.tenantId, windowDays, filterIds);
    deptPivotRows = result.rows;
    computedAt = result.computedAt;
    if (filterDepartmentId) {
      deptPivotRows = deptPivotRows.filter((r) => r.departmentId === filterDepartmentId);
    }
  } else if (view === "INSTRUCTION_LIST") {
    const obsWhere: any = { tenantId: user.tenantId };

    const windowStart = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);
    obsWhere.observedAt = { gte: windowStart };

    if (filterDepartmentId) {
      const deptMembers = await (prisma as any).departmentMembership.findMany({
        where: { tenantId: user.tenantId, departmentId: filterDepartmentId },
      });
      const ids = (deptMembers as any[]).map((m: any) => m.userId);
      obsWhere.observedTeacherId = { in: ids };
    } else if (filterTeacherId) {
      obsWhere.observedTeacherId = filterTeacherId;
    } else if (user.role === "HOD" && hodDepartmentIds.length > 0) {
      const deptMembers = await (prisma as any).departmentMembership.findMany({
        where: { tenantId: user.tenantId, departmentId: { in: hodDepartmentIds } },
      });
      const ids = (deptMembers as any[]).map((m: any) => m.userId);
      obsWhere.observedTeacherId = { in: ids };
    }

    if (filterYearGroup) obsWhere.yearGroup = filterYearGroup;
    if (filterSubject) obsWhere.subject = { contains: filterSubject, mode: "insensitive" };

    observationList = await (prisma as any).observation.findMany({
      where: obsWhere,
      include: {
        observedTeacher: { select: { fullName: true } },
        observer: { select: { fullName: true } },
        signals: { select: { signalKey: true, valueKey: true, notObserved: true } },
      },
      orderBy: { observedAt: "desc" },
      take: 100,
    });

  } else if (view === "TEACHER_PRIORITIES") {
    teacherRiskRows = await computeTeacherRiskIndex(user.tenantId, windowDays);
    if (user.role === "HOD" && hodDepartmentIds.length > 0) {
      const deptMembers = await (prisma as any).departmentMembership.findMany({
        where: { tenantId: user.tenantId, departmentId: { in: hodDepartmentIds } },
      });
      const allowedIds = new Set((deptMembers as any[]).map((m: any) => m.userId));
      teacherRiskRows = teacherRiskRows.filter((r) => allowedIds.has(r.teacherMembershipId));
    }
    if (filterDepartmentId) {
      const deptMembers = await (prisma as any).departmentMembership.findMany({
        where: { tenantId: user.tenantId, departmentId: filterDepartmentId },
      });
      const ids = new Set((deptMembers as any[]).map((m: any) => m.userId));
      teacherRiskRows = teacherRiskRows.filter((r) => ids.has(r.teacherMembershipId));
    }
  } else if (view === "CPD_SIGNALS") {
    let cpdDeptId = filterDepartmentId || undefined;
    if (user.role === "HOD" && hodDepartmentIds.length > 0) {
      if (cpdDeptId) {
        if (!hodDepartmentIds.includes(cpdDeptId)) cpdDeptId = hodDepartmentIds[0];
      } else {
        cpdDeptId = hodDepartmentIds[0];
      }
    }
    const deptFilter = cpdDeptId ? { departmentId: cpdDeptId } : undefined;
    cpdRows = await computeCpdPriorities(user.tenantId, windowDays, deptFilter);
    cpdImprovingRows = getTopImprovingSignals(cpdRows);
  } else if (view === "BEHAVIOUR_STUDENTS_TABLE") {
    const result = await computeStudentRiskIndex(user.tenantId, windowDays, user.id);
    studentRows = result.rows;
    computedAt = result.computedAt;
    if (filterYearGroup) studentRows = studentRows.filter((r) => r.yearGroup === filterYearGroup);
    if (studentSearch) {
      const q = studentSearch.toLowerCase();
      studentRows = studentRows.filter((r) => r.studentName.toLowerCase().includes(q));
    }
  } else if (view === "BEHAVIOUR_COHORTS_PIVOT") {
    const result = await computeCohortPivot(user.tenantId, windowDays);
    cohortRows = result.rows;
    computedAt = result.computedAt;
    if (filterYearGroup) cohortRows = cohortRows.filter((r) => r.yearGroup === filterYearGroup);
  }

  const computedAtStr = computedAt.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const yearGroups = Array.from(
    new Set(studentRows.map((r) => r.yearGroup).filter(Boolean) as string[])
  ).sort();
  const cohortYearGroups = Array.from(new Set(cohortRows.map((r) => r.yearGroup))).sort();
  const allYearGroups = Array.from(new Set([...yearGroups, ...cohortYearGroups])).sort();

  // Build filter query string helper
  function buildFilterQuery(overrides: Record<string, string> = {}) {
    const params: Record<string, string> = {
      view,
      windowDays: String(windowDays),
      ...(filterDepartmentId ? { departmentId: filterDepartmentId } : {}),
      ...(filterTeacherId ? { teacherMembershipId: filterTeacherId } : {}),
      ...(filterYearGroup ? { yearGroup: filterYearGroup } : {}),
      ...(filterSubject ? { subject: filterSubject } : {}),
      ...(studentSearch ? { studentSearch } : {}),
      ...(density !== "comfortable" ? { density } : {}),
      ...(sortSignal ? { sortSignal, sortDir } : {}),
      ...overrides,
    };
    return "?" + new URLSearchParams(params).toString();
  }

  const signalKeys = SIGNAL_DEFINITIONS.map((s) => s.key);
  const signalLabels = new Map(SIGNAL_DEFINITIONS.map((s) => [s.key, s.displayNameDefault]));

  // Apply signal column sort if requested (overrides default status + drift sort)
  if (sortSignal && (signalKeys as string[]).includes(sortSignal)) {
    teacherPivotRows = [...teacherPivotRows].sort((a, b) => {
      const aDelta = a.signalData[sortSignal]?.delta ?? null;
      const bDelta = b.signalData[sortSignal]?.delta ?? null;
      if (aDelta === null && bDelta === null) return 0;
      if (aDelta === null) return 1;
      if (bDelta === null) return -1;
      return sortDir === "asc" ? aDelta - bDelta : bDelta - aDelta;
    });
    deptPivotRows = [...deptPivotRows].sort((a, b) => {
      const aDelta = a.signalData[sortSignal]?.delta ?? null;
      const bDelta = b.signalData[sortSignal]?.delta ?? null;
      if (aDelta === null && bDelta === null) return 0;
      if (aDelta === null) return 1;
      if (bDelta === null) return -1;
      return sortDir === "asc" ? aDelta - bDelta : bDelta - aDelta;
    });
  }

  // suppress unused variable warning
  void settings;
  void BAND_ORDER;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Explorer"
        subtitle={<>Updated {computedAtStr}</>}
      />

      {/* Combined filters and view selector */}
      <Card>
        <form method="GET" action="/explorer" className="space-y-5">
          <input type="hidden" name="view" value={view} />

          {/* View selector tabs */}
          <div className="inline-flex items-center rounded-lg border border-border bg-[#f4f7fb] p-0.5 flex-wrap">
            {(["INSTRUCTION_TEACHERS_PIVOT", "INSTRUCTION_DEPARTMENTS_PIVOT", "INSTRUCTION_LIST", "TEACHER_PRIORITIES", "CPD_SIGNALS"] as ViewMode[]).map((v) => (
              <Link
                key={v}
                href={buildFilterQuery({ view: v })}
                className={`rounded-md px-3.5 py-1.5 text-sm font-medium calm-transition ${
                  v === view
                    ? "bg-white text-text shadow-sm"
                    : "text-muted hover:text-text"
                }`}
              >
                {VIEW_LABELS[v]}
              </Link>
            ))}
            {canSeeBehaviour && (
              <>
                <span className="mx-1 h-5 w-px bg-border/60" />
                {(["BEHAVIOUR_STUDENTS_TABLE", "BEHAVIOUR_COHORTS_PIVOT"] as ViewMode[]).map((v) => (
                  <Link
                    key={v}
                    href={buildFilterQuery({ view: v })}
                    className={`rounded-md px-3.5 py-1.5 text-sm font-medium calm-transition ${
                      v === view
                        ? "bg-white text-text shadow-sm"
                        : "text-muted hover:text-text"
                    }`}
                  >
                    {VIEW_LABELS[v]}
                  </Link>
                ))}
              </>
            )}
          </div>

          {/* Filters row */}
          <div className="flex flex-wrap items-end gap-4">
            {/* Window selector */}
            <div className="flex flex-col gap-2">
              <MetaText>Window</MetaText>
              <select
                name="windowDays"
                defaultValue={String(windowDays)}
                className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-text"
              >
                {WINDOW_OPTIONS.map((w) => (
                  <option key={w} value={String(w)}>{w} days</option>
                ))}
              </select>
            </div>

            {/* Department filter */}
            <div className="flex flex-col gap-2">
              <MetaText>Department</MetaText>
              <select
                name="departmentId"
                defaultValue={filterDepartmentId}
                className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-text"
              >
                <option value="">All departments</option>
                {(departments as any[]).map((d: any) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Year group filter */}
            <div className="flex flex-col gap-2">
              <MetaText>Year group</MetaText>
              <select
                name="yearGroup"
                defaultValue={filterYearGroup}
                className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-text"
              >
                <option value="">All years</option>
                {allYearGroups.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            {/* Subject filter (for observation list) */}
            {view === "INSTRUCTION_LIST" && (
              <div className="flex flex-col gap-2">
                <MetaText>Subject</MetaText>
                <input
                  type="text"
                  name="subject"
                  defaultValue={filterSubject}
                  placeholder="Any subject"
                  className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-text placeholder:text-muted"
                />
              </div>
            )}

            {/* Student search (behaviour views) */}
            {isBehaviourView && (
              <div className="flex flex-col gap-2">
                <MetaText>Student search</MetaText>
                <input
                  type="text"
                  name="studentSearch"
                  defaultValue={studentSearch}
                  placeholder="Name…"
                  className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-text placeholder:text-muted"
                />
              </div>
            )}

            <Button type="submit" className="px-4 py-1.5">Apply</Button>

            <Link
              href={`/explorer?view=${view}&windowDays=${windowDays}`}
              className="calm-transition rounded-lg border border-border bg-surface px-4 py-1.5 text-sm text-muted transition duration-200 ease-calm hover:border-accentHover"
            >
              Reset
            </Link>
          </div>
        </form>
      </Card>

      {/* ── Results area ──────────────────────────────────────────────────────── */}

      {/* INSTRUCTION_TEACHERS_PIVOT */}
      {view === "INSTRUCTION_TEACHERS_PIVOT" && (
        <Card className="overflow-x-auto p-0">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div>
              <SectionHeader title="Teachers" />
              <MetaText>{teacherPivotRows.length} teacher{teacherPivotRows.length !== 1 ? "s" : ""} in scope · Window: {windowDays} days</MetaText>
            </div>
            {canExport ? (
              <form action="/api/explorer/export" method="POST">
                <input type="hidden" name="view" value={view} />
                <input type="hidden" name="windowDays" value={String(windowDays)} />
                <input type="hidden" name="departmentId" value={filterDepartmentId} />
                <input type="hidden" name="yearGroup" value={filterYearGroup} />
                <input type="hidden" name="teacherMembershipId" value={filterTeacherId} />
                <input type="hidden" name="subject" value={filterSubject} />
                <input type="hidden" name="studentSearch" value={studentSearch} />
                <button type="submit" className="inline-flex items-center justify-center rounded-lg p-2 text-muted hover:bg-bg hover:text-text calm-transition" title="Export CSV">
                  <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5" xmlns="http://www.w3.org/2000/svg">
                    <path d="M10 3v10m0 0-3.5-3.5M10 13l3.5-3.5M4 16h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </form>
            ) : null}
          </div>
          {teacherPivotRows.length === 0 ? (
            <div className="p-6">
              <EmptyState title="No teachers in scope" description="No teachers with observations in this window." />
            </div>
          ) : (
            <>
              {/* Mobile card fallback (< md) */}
              <div className="md:hidden divide-y divide-divider">
                {teacherPivotRows.map((row) => {
                  const worstDeltas = signalKeys
                    .map((k) => ({ key: k, label: signalLabels.get(k) ?? k, delta: row.signalData[k]?.delta ?? null }))
                    .filter((x) => x.delta !== null)
                    .sort((a, b) => (a.delta as number) - (b.delta as number))
                    .slice(0, 3);
                  return (
                    <div key={row.teacherMembershipId} className="px-4 py-3 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <Link href={`/analysis/teachers/${row.teacherMembershipId}?window=${windowDays}`} className="font-medium text-text hover:underline">
                          {row.teacherName}
                        </Link>
                        <StatusPill variant={STATUS_VARIANT[row.status]} size="sm">
                          {STATUS_LABELS[row.status]}
                        </StatusPill>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted">
                        <span>{row.departmentNames.join(", ") || "—"}</span>
                        <span>Coverage: {row.teacherCoverage}</span>
                      </div>
                      {worstDeltas.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-0.5">
                          {worstDeltas.map((x) => (
                            <span key={x.key} className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50/60 px-2 py-0.5 text-xs text-amber-800">
                              {x.label?.slice(0, 10)}: Δ {(x.delta as number) > 0 ? "+" : ""}{(x.delta as number).toFixed(1)}
                            </span>
                          ))}
                        </div>
                      )}
                      <Link
                        href={buildFilterQuery({ density: "comfortable" })}
                        className="inline-block text-xs text-accent hover:underline mt-1"
                      >
                        Open full pivot →
                      </Link>
                    </div>
                  );
                })}
              </div>
              {/* Desktop table (≥ md) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="sticky top-0 z-10">
                    <tr className="border-b border-border bg-bg text-left text-xs font-medium text-muted">
                      <th className="sticky-first-column sticky-first-column-header whitespace-nowrap px-4 py-3">Teacher</th>
                      <th className="px-4 py-3">Department</th>
                      <th className="px-4 py-3 text-right">Coverage</th>
                      <th className="px-4 py-3">Band</th>
                      <th className="px-4 py-3 text-right">Drift</th>
                      {signalKeys.map((k) => {
                        const isSorted = sortSignal === k;
                        const nextDir = isSorted && sortDir === "desc" ? "asc" : "desc";
                        return (
                          <th key={k} className="px-3 py-3 text-right min-w-[90px]">
                            <Link
                              href={buildFilterQuery({ sortSignal: k, sortDir: nextDir })}
                              title={signalLabels.get(k)}
                              className={`inline-flex items-center justify-end gap-0.5 hover:text-text transition-colors ${isSorted ? "text-text" : ""}`}
                            >
                              {signalLabels.get(k) ?? k}
                              <span className="text-[10px]">{isSorted ? (sortDir === "desc" ? "↓" : "↑") : "⇅"}</span>
                            </Link>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {teacherPivotRows.map((row) => (
                      <tr key={row.teacherMembershipId} className="border-b border-divider last:border-0 group">
                        <td className="sticky-first-column whitespace-nowrap px-4 py-3 font-medium text-text group-hover:bg-bg calm-transition">
                          <Link href={`/analysis/teachers/${row.teacherMembershipId}?window=${windowDays}`} className="inline-flex items-center gap-2 hover:underline">
                            <Avatar name={row.teacherName} size="sm" />
                            {row.teacherName}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-muted text-xs group-hover:bg-bg calm-transition">{row.departmentNames.join(", ") || "—"}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-muted group-hover:bg-bg calm-transition">{row.teacherCoverage}</td>
                        <td className="px-4 py-3 group-hover:bg-bg calm-transition">
                          <StatusPill variant={STATUS_VARIANT[row.status]} size="sm">
                            {STATUS_LABELS[row.status]}
                          </StatusPill>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-muted group-hover:bg-bg calm-transition">{row.normalizedIDS.toFixed(1)}</td>
                        {signalKeys.map((k) => {
                          const cell = row.signalData[k] ?? { currentMean: null, prevMean: null, delta: null, coverageCount: 0 };
                          const label = signalLabels.get(k) ?? k;
                          return (
                            <td
                              key={k}
                              className={pivotCellClass(cell.delta, density)}
                              title={pivotCellTooltip(label, cell, windowDays, computedAtStr)}
                            >
                              <div className="flex flex-col items-end gap-0.5">
                                <span className="text-text tabular-nums">
                                  {cell.currentMean !== null ? cell.currentMean.toFixed(1) : "—"}
                                </span>
                                <span className="text-[11px] text-muted tabular-nums">
                                  Δ {cell.delta !== null ? (cell.delta > 0 ? "+" : "") + cell.delta.toFixed(1) : "—"}
                                </span>
                              </div>
                              {cell.delta !== null && cell.delta > VISUAL_THRESHOLD && (
                                <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-green-400 align-middle" />
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </Card>
      )}

      {/* INSTRUCTION_DEPARTMENTS_PIVOT */}
      {view === "INSTRUCTION_DEPARTMENTS_PIVOT" && (
        <Card className="overflow-x-auto p-0">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div>
              <SectionHeader title="Departments" />
              <MetaText>{deptPivotRows.length} department{deptPivotRows.length !== 1 ? "s" : ""} in scope · Window: {windowDays} days</MetaText>
            </div>
            {canExport ? (
              <form action="/api/explorer/export" method="POST">
                <input type="hidden" name="view" value={view} />
                <input type="hidden" name="windowDays" value={String(windowDays)} />
                <input type="hidden" name="departmentId" value={filterDepartmentId} />
                <input type="hidden" name="yearGroup" value={filterYearGroup} />
                <input type="hidden" name="teacherMembershipId" value={filterTeacherId} />
                <input type="hidden" name="subject" value={filterSubject} />
                <input type="hidden" name="studentSearch" value={studentSearch} />
                <button type="submit" className="inline-flex items-center justify-center rounded-lg p-2 text-muted hover:bg-bg hover:text-text calm-transition" title="Export CSV">
                  <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5" xmlns="http://www.w3.org/2000/svg">
                    <path d="M10 3v10m0 0-3.5-3.5M10 13l3.5-3.5M4 16h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </form>
            ) : null}
          </div>
          {deptPivotRows.length === 0 ? (
            <div className="p-6">
              <EmptyState title="No departments in scope" description="No departments with data in this window." />
            </div>
          ) : (
            <>
              {/* Mobile card fallback (< md) */}
              <div className="md:hidden divide-y divide-divider">
                {deptPivotRows.map((row) => {
                  const worstDeltas = signalKeys
                    .map((k) => ({ key: k, label: signalLabels.get(k) ?? k, delta: row.signalData[k]?.delta ?? null }))
                    .filter((x) => x.delta !== null)
                    .sort((a, b) => (a.delta as number) - (b.delta as number))
                    .slice(0, 3);
                  return (
                    <div key={row.departmentId} className="px-4 py-3 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <Link href={`/scope?departmentId=${row.departmentId}&window=${windowDays}`} className="font-medium text-text hover:underline">
                          {row.departmentName}
                        </Link>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted">
                        <span>Teachers: {row.teacherCount}</span>
                        <span>Obs: {row.observationCount}</span>
                      </div>
                      {worstDeltas.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-0.5">
                          {worstDeltas.map((x) => (
                            <span key={x.key} className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50/60 px-2 py-0.5 text-xs text-amber-800">
                              {x.label?.slice(0, 10)}: Δ {(x.delta as number) > 0 ? "+" : ""}{(x.delta as number).toFixed(1)}
                            </span>
                          ))}
                        </div>
                      )}
                      <Link
                        href={buildFilterQuery({ density: "comfortable" })}
                        className="inline-block text-xs text-accent hover:underline mt-1"
                      >
                        Open full pivot →
                      </Link>
                    </div>
                  );
                })}
              </div>
              {/* Desktop table (≥ md) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="sticky top-0 z-10">
                    <tr className="border-b border-border bg-bg text-left text-xs font-medium text-muted">
                      <th className="sticky-first-column sticky-first-column-header px-4 py-3">Department</th>
                      <th className="px-4 py-3 text-right">Teachers</th>
                      <th className="px-4 py-3 text-right">Observations</th>
                      {signalKeys.map((k) => {
                        const isSorted = sortSignal === k;
                        const nextDir = isSorted && sortDir === "desc" ? "asc" : "desc";
                        return (
                          <th key={k} className="px-3 py-3 text-right min-w-[90px]">
                            <Link
                              href={buildFilterQuery({ sortSignal: k, sortDir: nextDir })}
                              title={signalLabels.get(k)}
                              className={`inline-flex items-center justify-end gap-0.5 hover:text-text transition-colors ${isSorted ? "text-text" : ""}`}
                            >
                              {signalLabels.get(k) ?? k}
                              <span className="text-[10px]">{isSorted ? (sortDir === "desc" ? "↓" : "↑") : "⇅"}</span>
                            </Link>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {deptPivotRows.map((row) => (
                      <tr key={row.departmentId} className="border-b border-divider last:border-0 hover:bg-bg">
                        <td className="sticky-first-column px-4 py-3 font-medium text-text">
                          <Link href={`/scope?departmentId=${row.departmentId}&window=${windowDays}`} className="hover:underline">
                            {row.departmentName}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-muted">{row.teacherCount}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-muted">{row.observationCount}</td>
                        {signalKeys.map((k) => {
                          const cell = row.signalData[k] ?? { currentMean: null, prevMean: null, delta: null, coverageCount: 0 };
                          const label = signalLabels.get(k) ?? k;
                          return (
                            <td
                              key={k}
                              className={pivotCellClass(cell.delta, density)}
                              title={pivotCellTooltip(label, cell, windowDays, computedAtStr)}
                            >
                              <div className="flex flex-col items-end gap-0.5">
                                <span className="text-text tabular-nums">
                                  {cell.currentMean !== null ? cell.currentMean.toFixed(1) : "—"}
                                </span>
                                <span className="text-[11px] text-muted tabular-nums">
                                  Δ {cell.delta !== null ? (cell.delta > 0 ? "+" : "") + cell.delta.toFixed(1) : "—"}
                                </span>
                              </div>
                              {cell.delta !== null && cell.delta > VISUAL_THRESHOLD && (
                                <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-green-400 align-middle" />
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </Card>
      )}

      {/* INSTRUCTION_LIST */}
      {view === "INSTRUCTION_LIST" && (
        <Card className="overflow-hidden p-0">
          <div className="border-b border-border px-4 py-3">
            <SectionHeader title="Observation list" />
            <MetaText>{observationList.length} observation{observationList.length !== 1 ? "s" : ""} shown · Window: {windowDays} days</MetaText>
          </div>
          {observationList.length === 0 ? (
            <div className="p-6">
              <EmptyState title="No observations found" description="Try adjusting your filters or expanding the window." />
            </div>
          ) : (
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-bg text-left text-xs font-medium text-muted">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Teacher</th>
                  <th className="px-4 py-3">Year</th>
                  <th className="px-4 py-3">Subject</th>
                  <th className="px-4 py-3">Phase</th>
                  <th className="px-4 py-3">Signals</th>
                  <th className="px-4 py-3">Observer</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {observationList.map((obs: any) => {
                  const signalCount = Array.isArray(obs.signals)
                    ? (obs.signals as any[]).filter((s: any) => s.valueKey && !s.notObserved).length
                    : 0;
                  const totalSignals = Array.isArray(obs.signals) ? obs.signals.length : 0;
                  return (
                    <tr key={obs.id} className="border-b border-divider last:border-0 hover:bg-bg">
                      <td className="px-4 py-3 tabular-nums text-muted">
                        <Link href={`/observe/${obs.id}`} className="hover:underline">
                          {new Date(obs.observedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                        </Link>
                      </td>
                      <td className="px-4 py-3 font-medium text-text">
                        <Link href={`/observe/${obs.id}`} className="inline-flex items-center gap-2 hover:underline">
                          <Avatar name={obs.observedTeacher?.fullName ?? "?"} size="sm" />
                          {obs.observedTeacher?.fullName ?? "—"}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-muted">{obs.yearGroup}</td>
                      <td className="px-4 py-3 text-muted">{obs.subject}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-md bg-[#f4f7fb] px-2 py-0.5 text-xs font-medium text-muted">
                          {formatPhaseLabel(obs.phase ?? "Unknown")}
                        </span>
                      </td>
                      <td className="px-4 py-3 tabular-nums text-muted">{signalCount}/{totalSignals}</td>
                      <td className="px-4 py-3 text-muted">{obs.observer?.fullName ?? "—"}</td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/observe/${obs.id}`}
                          className="calm-transition inline-flex items-center rounded-lg border border-border bg-white px-3 py-1 text-xs font-medium text-text shadow-sm hover:border-accent/30 hover:text-accent"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </Card>
      )}

      {/* TEACHER_PRIORITIES */}
      {view === "TEACHER_PRIORITIES" && (
        <Card className="overflow-x-auto p-0">
          <div className="border-b border-border px-4 py-3">
            <SectionHeader title="Teacher priorities" />
            <MetaText>{teacherRiskRows.length} teacher{teacherRiskRows.length !== 1 ? "s" : ""} with data · Window: {windowDays} days</MetaText>
          </div>
          {teacherRiskRows.length === 0 ? (
            <div className="p-6">
              <EmptyState title="No teacher data" description="No teachers have enough observation data in this window." />
            </div>
          ) : (
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-bg text-left text-xs font-medium text-muted">
                  <th className="sticky-first-column sticky-first-column-header px-4 py-3">Teacher</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3 text-right">Coverage</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Drift score</th>
                  <th className="px-4 py-3">Top drivers</th>
                  <th className="px-4 py-3">Last observed</th>
                </tr>
              </thead>
              <tbody>
                {teacherRiskRows.map((row) => (
                  <tr key={row.teacherMembershipId} className="border-b border-divider last:border-0 hover:bg-bg">
                    <td className="sticky-first-column px-4 py-3 font-medium text-text">
                      <Link href={`/analysis/teachers/${row.teacherMembershipId}?window=${windowDays}`} className="inline-flex items-center gap-2 hover:underline">
                        <Avatar name={row.teacherName} size="sm" />
                        {row.teacherName}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted text-xs">{row.departmentNames.join(", ") || "—"}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted">{row.teacherCoverage}</td>
                    <td className="px-4 py-3">
                      <StatusPill variant={STATUS_VARIANT[row.status]} size="sm">
                        {STATUS_LABELS[row.status]}
                      </StatusPill>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted">{row.normalizedIDS.toFixed(1)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {row.topDrivers.length > 0 ? row.topDrivers.map((d) => {
                          const label = SIGNAL_DEFINITIONS.find((s) => s.key === d.signalKey)?.displayNameDefault ?? d.signalKey;
                          return (
                            <span key={d.signalKey} className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50/60 px-2 py-0.5 text-xs text-amber-800">
                              {label.length > 18 ? label.slice(0, 16) + "…" : label}
                              <span className="tabular-nums">{d.delta > 0 ? "+" : ""}{d.delta.toFixed(1)}</span>
                            </span>
                          );
                        }) : (
                          <span className="text-xs text-muted">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs tabular-nums text-muted">
                      {row.lastObservationAt
                        ? new Date(row.lastObservationAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}

      {/* CPD_SIGNALS */}
      {view === "CPD_SIGNALS" && (
        <div className="space-y-6">
          <Card className="overflow-x-auto p-0">
            <div className="border-b border-border px-4 py-3">
              <SectionHeader title="CPD priority signals" />
              <MetaText>Signals ranked by how commonly they are weakening across teachers · Window: {windowDays} days</MetaText>
            </div>
            {cpdRows.length === 0 ? (
              <div className="p-6">
                <EmptyState title="No CPD data" description="Not enough eligible teachers in this window to compute priorities." />
              </div>
            ) : (
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-bg text-left text-xs font-medium text-muted">
                    <th className="px-4 py-3">Signal</th>
                    <th className="px-4 py-3 text-right">Teachers covered</th>
                    <th className="px-4 py-3 text-right">Drifting</th>
                    <th className="px-4 py-3 text-right">Drift rate</th>
                    <th className="px-4 py-3 text-right">Avg drift</th>
                    <th className="px-4 py-3 text-right">Priority score</th>
                    <th className="px-4 py-3 text-right">Improving</th>
                    <th className="px-4 py-3 text-right">Improve rate</th>
                  </tr>
                </thead>
                <tbody>
                  {cpdRows.map((row) => (
                    <tr key={row.signalKey} className="border-b border-divider last:border-0 hover:bg-bg">
                      <td className="px-4 py-3 font-medium text-text">{row.label}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-muted">{row.teachersCovered}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-muted">{row.teachersDriftingDown}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-muted">
                        {(row.driftRate * 100).toFixed(0)}%
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {row.avgNegDeltaAbs !== null ? (
                          <span className="text-amber-600">−{row.avgNegDeltaAbs.toFixed(2)}</span>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {row.priorityScore > 0 ? (
                          <span className={`font-medium ${row.priorityScore > 0.1 ? "text-amber-700" : "text-muted"}`}>
                            {row.priorityScore.toFixed(3)}
                          </span>
                        ) : (
                          <span className="text-muted">0</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-muted">{row.teachersImproving}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-muted">
                        {(row.improvingRate * 100).toFixed(0)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>

          {cpdImprovingRows.length > 0 && (
            <Card className="p-0">
              <div className="border-b border-border px-4 py-3">
                <SectionHeader title="Positive momentum" />
                <MetaText>Signals showing the strongest improvement across teachers</MetaText>
              </div>
              <div className="divide-y divide-divider">
                {cpdImprovingRows.map((row) => (
                  <div key={row.signalKey} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-text">{row.label}</p>
                      <p className="text-xs text-muted">
                        {row.teachersImproving} teacher{row.teachersImproving !== 1 ? "s" : ""} improving · avg +{row.avgPositiveDelta?.toFixed(2) ?? "—"}
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-md border border-green-200 bg-green-50/60 px-2.5 py-1 text-xs font-medium text-green-700">
                      ↑ {(row.improvingRate * 100).toFixed(0)}% rate
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* BEHAVIOUR_STUDENTS_TABLE */}
      {view === "BEHAVIOUR_STUDENTS_TABLE" && (
        <Card className="overflow-x-auto p-0">
          <div className="border-b border-border px-4 py-3">
            <SectionHeader title="Student risk table" />
            <MetaText>{studentRows.length} student{studentRows.length !== 1 ? "s" : ""} in scope · Window: {windowDays} days</MetaText>
          </div>
          {studentRows.length === 0 ? (
            <div className="p-6">
              <EmptyState title="No students found" description="No students have snapshot data in this window." />
            </div>
          ) : (
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-bg text-left text-xs font-medium text-muted">
                  <th className="sticky-first-column sticky-first-column-header px-4 py-3">Student</th>
                  <th className="px-4 py-3">Year</th>
                  <th className="px-4 py-3">Band</th>
                  <th className="px-4 py-3">Drivers</th>
                  <th className="px-4 py-3 text-right">Attendance</th>
                  <th className="px-4 py-3 text-right">Detentions Δ</th>
                  <th className="px-4 py-3 text-right">On calls Δ</th>
                  <th className="px-4 py-3 text-right">Lateness Δ</th>
                  <th className="px-4 py-3">Flags</th>
                </tr>
              </thead>
              <tbody>
                {studentRows.map((row) => (
                  <tr key={row.studentId} className="border-b border-divider last:border-0 hover:bg-bg">
                    <td className="sticky-first-column px-4 py-3 font-medium text-text">
                      <Link href={`/analysis/students/${row.studentId}?window=${windowDays}`} className="hover:underline">
                        {row.studentName}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted">{row.yearGroup ?? "—"}</td>
                    <td className="px-4 py-3">
                      <StatusPill variant={BAND_VARIANT[row.band]} size="sm">
                        {BAND_LABELS[row.band]}
                      </StatusPill>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {row.drivers.map((d) => (
                          <span key={d.metric} className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
                            {d.label}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted">
                      {row.attendancePct !== null ? `${row.attendancePct.toFixed(1)}%` : "—"}
                      {row.attendanceDelta !== null && (
                        <span className={`ml-1 text-xs ${row.attendanceDelta < 0 ? "text-red-600" : "text-green-600"}`}>
                          ({row.attendanceDelta > 0 ? "+" : ""}{row.attendanceDelta.toFixed(1)})
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted">
                      {row.detentionsDelta !== null ? (row.detentionsDelta > 0 ? `+${row.detentionsDelta}` : String(row.detentionsDelta)) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted">
                      {row.onCallsDelta !== null ? (row.onCallsDelta > 0 ? `+${row.onCallsDelta}` : String(row.onCallsDelta)) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted">
                      {row.latenessDelta !== null ? (row.latenessDelta > 0 ? `+${row.latenessDelta}` : String(row.latenessDelta)) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {row.sendFlag && <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs text-purple-700">SEND</span>}
                        {row.ppFlag && <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">PP</span>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}

      {/* BEHAVIOUR_COHORTS_PIVOT */}
      {view === "BEHAVIOUR_COHORTS_PIVOT" && (
        <Card className="overflow-x-auto p-0">
          <div className="border-b border-border px-4 py-3">
            <SectionHeader title="Behaviour cohort pivot" />
            <MetaText>{cohortRows.length} year group{cohortRows.length !== 1 ? "s" : ""} · Window: {windowDays} days</MetaText>
          </div>
          {cohortRows.length === 0 ? (
            <div className="p-6">
              <EmptyState title="No cohort data" description="No cohort data is available in this window." />
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-bg text-left text-xs font-medium text-muted">
                  <th className="px-4 py-3">Year group</th>
                  <th className="px-4 py-3 text-right">Students</th>
                  <th className="px-4 py-3 text-right">Attendance</th>
                  <th className="px-4 py-3 text-right">Detentions</th>
                  <th className="px-4 py-3 text-right">On calls</th>
                  <th className="px-4 py-3 text-right">Lateness</th>
                  <th className="px-4 py-3 text-right">Suspensions</th>
                  <th className="px-4 py-3 text-right">Exclusions</th>
                </tr>
              </thead>
              <tbody>
                {cohortRows.map((row) => (
                  <tr key={row.yearGroup} className="border-b border-divider last:border-0 hover:bg-bg">
                    <td className="px-4 py-3 font-medium text-text">
                      <Link href={`/analysis/students?yearGroup=${encodeURIComponent(row.yearGroup)}&window=${windowDays}`} className="hover:underline">
                        {row.yearGroup}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted">{row.studentsCovered}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted">
                      {row.attendanceMean !== null ? `${row.attendanceMean.toFixed(1)}%` : "—"}
                      {row.attendanceDelta !== null && (
                        <span className={`ml-1 text-xs ${deltaClass(row.attendanceDelta)}`}>({fmtDelta(row.attendanceDelta, 1)})</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted">
                      {row.detentionsMean !== null ? row.detentionsMean.toFixed(1) : "—"}
                      {row.detentionsDelta !== null && (
                        <span className={`ml-1 text-xs ${deltaClass(row.detentionsDelta)}`}>({fmtDelta(row.detentionsDelta, 1)})</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted">
                      {row.onCallsMean !== null ? row.onCallsMean.toFixed(1) : "—"}
                      {row.onCallsDelta !== null && (
                        <span className={`ml-1 text-xs ${deltaClass(row.onCallsDelta)}`}>({fmtDelta(row.onCallsDelta, 1)})</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted">
                      {row.latenessMean !== null ? row.latenessMean.toFixed(1) : "—"}
                      {row.latenessDelta !== null && (
                        <span className={`ml-1 text-xs ${deltaClass(row.latenessDelta)}`}>({fmtDelta(row.latenessDelta, 1)})</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted">
                      {row.suspensionsCount}
                      {row.suspensionsDelta !== null && (
                        <span className={`ml-1 text-xs ${deltaClass(row.suspensionsDelta)}`}>({row.suspensionsDelta > 0 ? "+" : ""}{row.suspensionsDelta})</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted">
                      {row.internalExclusionsCount}
                      {row.internalExclusionsDelta !== null && (
                        <span className={`ml-1 text-xs ${deltaClass(row.internalExclusionsDelta)}`}>({row.internalExclusionsDelta > 0 ? "+" : ""}{row.internalExclusionsDelta})</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}

      <MetaText>Explorer · Window: last {windowDays} days · {computedAtStr}</MetaText>
    </div>
  );
}
