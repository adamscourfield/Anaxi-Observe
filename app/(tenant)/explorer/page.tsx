import Link from "next/link";
import { notFound } from "next/navigation";
import { getSessionUserOrThrow } from "@/lib/auth";
import { requireFeature } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { H1, H2, MetaText, BodyText } from "@/components/ui/typography";
import { SIGNAL_DEFINITIONS } from "@/modules/observations/signalDefinitions";
import {
  canViewExplorer,
  canExportExplorer,
  canViewBehaviourExplorer,
} from "@/modules/authz";
import { computeTeacherPivot, RiskStatus } from "@/modules/analysis/teacherRisk";
import { computeDepartmentPivot } from "@/modules/analysis/departmentPivot";
import { computeStudentRiskIndex, RiskBand, BAND_ORDER } from "@/modules/analysis/studentRisk";
import { computeCohortPivot } from "@/modules/analysis/cohortPivot";

const WINDOW_OPTIONS = [7, 21, 28] as const;
type WindowDays = (typeof WINDOW_OPTIONS)[number];

const VIEW_MODES = [
  "INSTRUCTION_TEACHERS_PIVOT",
  "INSTRUCTION_DEPARTMENTS_PIVOT",
  "INSTRUCTION_LIST",
  "BEHAVIOUR_STUDENTS_TABLE",
  "BEHAVIOUR_COHORTS_PIVOT",
] as const;
type ViewMode = (typeof VIEW_MODES)[number];

const VIEW_LABELS: Record<ViewMode, string> = {
  INSTRUCTION_TEACHERS_PIVOT: "Teachers pivot",
  INSTRUCTION_DEPARTMENTS_PIVOT: "Departments pivot",
  INSTRUCTION_LIST: "Observation list",
  BEHAVIOUR_STUDENTS_TABLE: "Students",
  BEHAVIOUR_COHORTS_PIVOT: "Cohorts",
};

const STATUS_LABELS: Record<RiskStatus, string> = {
  SIGNIFICANT_DRIFT: "Significant",
  EMERGING_DRIFT: "Emerging",
  STABLE: "Stable",
  LOW_COVERAGE: "Low coverage",
};

const STATUS_PILL: Record<RiskStatus, string> = {
  SIGNIFICANT_DRIFT: "bg-red-100 text-red-700",
  EMERGING_DRIFT: "bg-amber-100 text-amber-700",
  STABLE: "bg-green-100 text-green-700",
  LOW_COVERAGE: "bg-slate-100 text-slate-500",
};

const BAND_LABELS: Record<RiskBand, string> = {
  URGENT: "Urgent",
  PRIORITY: "Priority",
  WATCH: "Watch",
  STABLE: "Stable",
};

const BAND_PILL: Record<RiskBand, string> = {
  URGENT: "bg-red-100 text-red-700",
  PRIORITY: "bg-amber-100 text-amber-700",
  WATCH: "bg-yellow-100 text-yellow-700",
  STABLE: "bg-green-100 text-green-700",
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
      },
      orderBy: { observedAt: "desc" },
      take: 100,
    });

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
      {/* Page header */}
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-3">
          <H1>Explorer</H1>
          <span className="rounded-full border border-border bg-surface px-2.5 py-1 text-xs text-muted">
            Evidence &amp; pivots
          </span>
        </div>
        <MetaText>
          Updated {computedAtStr} · Window: last {windowDays} days · Coverage thresholds applied
        </MetaText>
      </div>

      {/* Filters panel */}
      <Card>
        <form method="GET" action="/explorer" className="space-y-3">
          <input type="hidden" name="view" value={view} />
          <div className="flex flex-wrap items-end gap-3">
            {/* Window selector */}
            <div className="flex flex-col gap-1">
              <MetaText>Window</MetaText>
              <div className="flex gap-1">
                {WINDOW_OPTIONS.map((w) => (
                  <Link
                    key={w}
                    href={buildFilterQuery({ windowDays: String(w) })}
                    className={`calm-transition rounded-lg border px-3 py-1.5 text-sm font-medium transition duration-200 ease-calm ${
                      w === windowDays
                        ? "border-accent bg-[var(--accent-tint)] text-text"
                        : "border-border bg-surface text-text hover:border-accentHover"
                    }`}
                  >
                    {w}d
                  </Link>
                ))}
              </div>
            </div>

            {/* Department filter */}
            <div className="flex flex-col gap-1">
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
            <div className="flex flex-col gap-1">
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
              <div className="flex flex-col gap-1">
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
              <div className="flex flex-col gap-1">
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

            <button
              type="submit"
              className="calm-transition rounded-lg border border-border bg-surface px-4 py-1.5 text-sm font-medium text-text transition duration-200 ease-calm hover:border-accentHover"
            >
              Apply
            </button>

            <Link
              href={`/explorer?view=${view}&windowDays=${windowDays}`}
              className="calm-transition rounded-lg border border-border bg-surface px-4 py-1.5 text-sm text-muted transition duration-200 ease-calm hover:border-accentHover"
            >
              Reset
            </Link>
          </div>
        </form>
      </Card>

      {/* View selector */}
      <div className="space-y-2">
        <MetaText>Instructional</MetaText>
        <div className="flex flex-wrap gap-2">
          {(["INSTRUCTION_TEACHERS_PIVOT", "INSTRUCTION_DEPARTMENTS_PIVOT", "INSTRUCTION_LIST"] as ViewMode[]).map((v) => (
            <Link
              key={v}
              href={buildFilterQuery({ view: v })}
              className={`calm-transition rounded-lg border px-4 py-2 text-sm font-medium transition duration-200 ease-calm ${
                v === view
                  ? "border-accent bg-[var(--accent-tint)] text-text"
                  : "border-border bg-surface text-text hover:border-accentHover"
              }`}
            >
              {VIEW_LABELS[v]}
            </Link>
          ))}
        </div>
        {canSeeBehaviour && (
          <>
            <MetaText className="mt-2">Behaviour</MetaText>
            <div className="flex flex-wrap gap-2">
              {(["BEHAVIOUR_STUDENTS_TABLE", "BEHAVIOUR_COHORTS_PIVOT"] as ViewMode[]).map((v) => (
                <Link
                  key={v}
                  href={buildFilterQuery({ view: v })}
                  className={`calm-transition rounded-lg border px-4 py-2 text-sm font-medium transition duration-200 ease-calm ${
                    v === view
                      ? "border-accent bg-[var(--accent-tint)] text-text"
                      : "border-border bg-surface text-text hover:border-accentHover"
                  }`}
                >
                  {VIEW_LABELS[v]}
                </Link>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Export button + density toggle */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Density toggle */}
        {(view === "INSTRUCTION_TEACHERS_PIVOT" || view === "INSTRUCTION_DEPARTMENTS_PIVOT") && (
          <div className="flex items-center gap-1 rounded-lg border border-border bg-surface p-0.5">
            {(["comfortable", "compact"] as const).map((d) => (
              <Link
                key={d}
                href={buildFilterQuery({ density: d })}
                className={`calm-transition rounded-md px-3 py-1 text-xs font-medium transition duration-200 ease-calm ${
                  d === density
                    ? "bg-[var(--accent-tint)] text-text"
                    : "text-muted hover:text-text"
                }`}
              >
                {d === "comfortable" ? "Comfortable" : "Compact"}
              </Link>
            ))}
          </div>
        )}
        {canExport ? (
          <form action="/api/explorer/export" method="POST">
            <input type="hidden" name="view" value={view} />
            <input type="hidden" name="windowDays" value={String(windowDays)} />
            <input type="hidden" name="departmentId" value={filterDepartmentId} />
            <input type="hidden" name="yearGroup" value={filterYearGroup} />
            <input type="hidden" name="teacherMembershipId" value={filterTeacherId} />
            <input type="hidden" name="subject" value={filterSubject} />
            <input type="hidden" name="studentSearch" value={studentSearch} />
            <button
              type="submit"
              className="calm-transition rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-text transition duration-200 ease-calm hover:border-accentHover"
            >
              Export CSV
            </button>
          </form>
        ) : (
          <span className="cursor-not-allowed rounded-lg border border-border bg-bg px-4 py-2 text-sm text-muted" title="Export not available for your role">
            Export CSV
          </span>
        )}
      </div>

      {/* ── Results area ──────────────────────────────────────────────────────── */}

      {/* INSTRUCTION_TEACHERS_PIVOT */}
      {view === "INSTRUCTION_TEACHERS_PIVOT" && (
        <Card className="overflow-x-auto p-0">
          <div className="border-b border-border px-4 py-3">
            <H2>Teachers × signals</H2>
            <MetaText>{teacherPivotRows.length} teacher{teacherPivotRows.length !== 1 ? "s" : ""} in scope · Window: {windowDays} days</MetaText>
          </div>
          {teacherPivotRows.length === 0 ? (
            <div className="p-6">
              <BodyText className="text-muted">No teachers with observations in this window.</BodyText>
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
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_PILL[row.status]}`}>
                          {STATUS_LABELS[row.status]}
                        </span>
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
                      <th className="px-4 py-3 sticky left-0 z-20 bg-bg">Teacher</th>
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
                              {signalLabels.get(k)?.slice(0, 6) ?? k}
                              <span className="text-[10px]">{isSorted ? (sortDir === "desc" ? "↓" : "↑") : "⇅"}</span>
                            </Link>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {teacherPivotRows.map((row) => (
                      <tr key={row.teacherMembershipId} className="border-b border-divider last:border-0 hover:bg-bg">
                        <td className="px-4 py-3 font-medium text-text sticky left-0 z-10 bg-surface">
                          <Link href={`/analysis/teachers/${row.teacherMembershipId}?window=${windowDays}`} className="hover:underline">
                            {row.teacherName}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-muted text-xs">{row.departmentNames.join(", ") || "—"}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-muted">{row.teacherCoverage}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_PILL[row.status]}`}>
                            {STATUS_LABELS[row.status]}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-muted">{row.normalizedIDS.toFixed(1)}</td>
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
          <div className="border-b border-border px-4 py-3">
            <H2>Departments × signals</H2>
            <MetaText>{deptPivotRows.length} department{deptPivotRows.length !== 1 ? "s" : ""} in scope · Window: {windowDays} days</MetaText>
          </div>
          {deptPivotRows.length === 0 ? (
            <div className="p-6">
              <BodyText className="text-muted">No departments with data in this window.</BodyText>
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
                      <th className="px-4 py-3 sticky left-0 z-20 bg-bg">Department</th>
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
                              {signalLabels.get(k)?.slice(0, 6) ?? k}
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
                        <td className="px-4 py-3 font-medium text-text sticky left-0 z-10 bg-surface">
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
            <H2>Observation list</H2>
            <MetaText>{observationList.length} observation{observationList.length !== 1 ? "s" : ""} shown · Window: {windowDays} days</MetaText>
          </div>
          {observationList.length === 0 ? (
            <div className="p-6">
              <BodyText className="text-muted">No observations found with the selected filters.</BodyText>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-bg text-left text-xs font-medium text-muted">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Teacher</th>
                  <th className="px-4 py-3">Year</th>
                  <th className="px-4 py-3">Subject</th>
                  <th className="px-4 py-3">Phase</th>
                  <th className="px-4 py-3">Observer</th>
                </tr>
              </thead>
              <tbody>
                {observationList.map((obs: any) => (
                  <tr key={obs.id} className="border-b border-divider last:border-0 hover:bg-bg">
                    <td className="px-4 py-3 tabular-nums text-muted">
                      {new Date(obs.observedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                    <td className="px-4 py-3 font-medium text-text">
                      <Link href={`/analysis/teachers/${obs.observedTeacherId}?window=${windowDays}`} className="hover:underline">
                        {obs.observedTeacher?.fullName ?? "—"}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted">{obs.yearGroup}</td>
                    <td className="px-4 py-3 text-muted">{obs.subject}</td>
                    <td className="px-4 py-3 text-muted text-xs">{obs.phase}</td>
                    <td className="px-4 py-3 text-muted">{obs.observer?.fullName ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}

      {/* BEHAVIOUR_STUDENTS_TABLE */}
      {view === "BEHAVIOUR_STUDENTS_TABLE" && (
        <Card className="overflow-hidden p-0">
          <div className="border-b border-border px-4 py-3">
            <H2>Student risk table</H2>
            <MetaText>{studentRows.length} student{studentRows.length !== 1 ? "s" : ""} in scope · Window: {windowDays} days</MetaText>
          </div>
          {studentRows.length === 0 ? (
            <div className="p-6">
              <BodyText className="text-muted">No students with snapshot data in this window.</BodyText>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-bg text-left text-xs font-medium text-muted">
                  <th className="px-4 py-3">Student</th>
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
                    <td className="px-4 py-3 font-medium text-text">
                      <Link href={`/analysis/students/${row.studentId}?window=${windowDays}`} className="hover:underline">
                        {row.studentName}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted">{row.yearGroup ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${BAND_PILL[row.band]}`}>
                        {BAND_LABELS[row.band]}
                      </span>
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
            <H2>Behaviour cohort pivot</H2>
            <MetaText>{cohortRows.length} year group{cohortRows.length !== 1 ? "s" : ""} · Window: {windowDays} days</MetaText>
          </div>
          {cohortRows.length === 0 ? (
            <div className="p-6">
              <BodyText className="text-muted">No cohort data available in this window.</BodyText>
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
