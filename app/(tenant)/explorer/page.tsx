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

/** Returns Tailwind background class for a signal mean score */
function meanToBgColor(mean: number): string {
  if (mean >= 3.5) return "bg-emerald-500";
  if (mean >= 2.5) return "bg-blue-500";
  if (mean >= 1.5) return "bg-amber-400";
  return "bg-rose-400";
}

/** Truncates a label for chip display */
function truncateLabel(label: string, max = 14): string {
  return label.length > max ? label.slice(0, max - 2) + "…" : label;
}

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

  // Shared export form helper
  function ExportButton({ view: v }: { view: string }) {
    if (!canExport) return null;
    return (
      <form action="/api/explorer/export" method="POST">
        <input type="hidden" name="view" value={v} />
        <input type="hidden" name="windowDays" value={String(windowDays)} />
        <input type="hidden" name="departmentId" value={filterDepartmentId} />
        <input type="hidden" name="yearGroup" value={filterYearGroup} />
        <input type="hidden" name="teacherMembershipId" value={filterTeacherId} />
        <input type="hidden" name="subject" value={filterSubject} />
        <input type="hidden" name="studentSearch" value={studentSearch} />
        <button
          type="submit"
          title="Export CSV"
          className="flex items-center gap-1.5 rounded-lg border border-border/50 bg-white/60 px-3 py-1.5 text-[0.75rem] font-medium text-muted calm-transition hover:border-accent/30 hover:text-accent"
        >
          <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5">
            <path d="M10 3v10m0 0-3.5-3.5M10 13l3.5-3.5M4 16h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          CSV
        </button>
      </form>
    );
  }

  // Shared empty state
  function Empty({ title, description }: { title: string; description: string }) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="text-[0.875rem] font-semibold text-text">{title}</p>
        <p className="mt-1 text-[0.8125rem] text-muted">{description}</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[1.5rem] font-bold tracking-tight text-text">Explorer</h1>
          <p className="mt-0.5 text-[0.8125rem] text-muted">Updated {computedAtStr}</p>
        </div>
        {/* Window selector */}
        <div className="flex items-center gap-1 rounded-xl border border-white/60 bg-white/60 p-1 backdrop-blur-sm">
          {WINDOW_OPTIONS.map((w) => (
            <Link
              key={w}
              href={buildFilterQuery({ windowDays: String(w) })}
              className={`rounded-lg px-3.5 py-1.5 text-[0.8125rem] font-semibold calm-transition ${
                windowDays === w
                  ? "bg-accent text-white shadow-sm"
                  : "text-muted hover:text-text"
              }`}
            >
              {w}d
            </Link>
          ))}
        </div>
      </div>

      {/* View mode tabs — horizontally scrollable, never wraps */}
      <div className="flex overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex min-w-max items-center gap-1 rounded-2xl border border-white/60 bg-white/60 p-1.5 backdrop-blur-sm">
          {/* Instruction views */}
          <span className="mr-1 pl-1 text-[0.625rem] font-semibold uppercase tracking-[0.1em] text-muted/70">Instruction</span>
          {(["INSTRUCTION_TEACHERS_PIVOT", "INSTRUCTION_DEPARTMENTS_PIVOT", "INSTRUCTION_LIST", "TEACHER_PRIORITIES", "CPD_SIGNALS"] as ViewMode[]).map((v) => (
            <Link
              key={v}
              href={buildFilterQuery({ view: v })}
              className={`whitespace-nowrap rounded-xl px-3.5 py-2 text-[0.8125rem] font-medium calm-transition ${
                v === view
                  ? "bg-white text-text shadow-sm"
                  : "text-muted hover:bg-white/60 hover:text-text"
              }`}
            >
              {VIEW_LABELS[v]}
            </Link>
          ))}

          {/* Behaviour views */}
          {canSeeBehaviour && (
            <>
              <span className="mx-1 h-5 w-px bg-border/60" />
              <span className="mr-1 pl-1 text-[0.625rem] font-semibold uppercase tracking-[0.1em] text-muted/70">Behaviour</span>
              {(["BEHAVIOUR_STUDENTS_TABLE", "BEHAVIOUR_COHORTS_PIVOT"] as ViewMode[]).map((v) => (
                <Link
                  key={v}
                  href={buildFilterQuery({ view: v })}
                  className={`whitespace-nowrap rounded-xl px-3.5 py-2 text-[0.8125rem] font-medium calm-transition ${
                    v === view
                      ? "bg-white text-text shadow-sm"
                      : "text-muted hover:bg-white/60 hover:text-text"
                  }`}
                >
                  {VIEW_LABELS[v]}
                </Link>
              ))}
            </>
          )}
        </div>
      </div>

      {/* Filter bar */}
      <form method="GET" action="/explorer" className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="view" value={view} />
        <input type="hidden" name="windowDays" value={String(windowDays)} />

        <select name="departmentId" defaultValue={filterDepartmentId} className="field min-w-[140px] flex-none py-1.5 text-[0.8125rem]">
          <option value="">All departments</option>
          {(departments as any[]).map((d: any) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>

        <select name="yearGroup" defaultValue={filterYearGroup} className="field min-w-[110px] flex-none py-1.5 text-[0.8125rem]">
          <option value="">All years</option>
          {allYearGroups.map((y) => (
            <option key={y} value={y}>Year {y}</option>
          ))}
        </select>

        {view === "INSTRUCTION_LIST" && (
          <input
            type="text"
            name="subject"
            defaultValue={filterSubject}
            placeholder="Subject…"
            className="field min-w-[120px] flex-none py-1.5 text-[0.8125rem]"
          />
        )}

        {isBehaviourView && (
          <input
            type="text"
            name="studentSearch"
            defaultValue={studentSearch}
            placeholder="Search student…"
            className="field min-w-[160px] flex-none py-1.5 text-[0.8125rem]"
          />
        )}

        <div className="flex items-center gap-1.5">
          <button
            type="submit"
            className="rounded-lg bg-accent px-3.5 py-1.5 text-[0.8125rem] font-semibold text-white calm-transition hover:bg-accentHover"
          >
            Apply
          </button>
          {(filterDepartmentId || filterYearGroup || filterSubject || studentSearch) && (
            <Link
              href={`/explorer?view=${view}&windowDays=${windowDays}`}
              className="rounded-lg border border-border/60 bg-white/70 px-3.5 py-1.5 text-[0.8125rem] font-medium text-muted calm-transition hover:text-text"
            >
              Clear
            </Link>
          )}
        </div>

        {/* Density toggle */}
        <div className="ml-auto flex items-center gap-1 rounded-lg border border-border/40 bg-white/60 p-0.5">
          {(["comfortable", "compact"] as const).map((d) => (
            <Link
              key={d}
              href={buildFilterQuery({ density: d })}
              title={d === "comfortable" ? "Comfortable" : "Compact"}
              className={`rounded-md px-2.5 py-1 text-[0.75rem] font-medium calm-transition ${
                density === d ? "bg-white text-text shadow-sm" : "text-muted hover:text-text"
              }`}
            >
              {d === "comfortable" ? (
                <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="3" y="5" width="14" height="2.5" rx="0.75" /><rect x="3" y="9.5" width="14" height="2.5" rx="0.75" /><rect x="3" y="14" width="14" height="2.5" rx="0.75" />
                </svg>
              ) : (
                <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="3" y="4" width="14" height="1.5" rx="0.5" /><rect x="3" y="7.5" width="14" height="1.5" rx="0.5" /><rect x="3" y="11" width="14" height="1.5" rx="0.5" /><rect x="3" y="14.5" width="14" height="1.5" rx="0.5" />
                </svg>
              )}
            </Link>
          ))}
        </div>
      </form>

      {/* ── Results area ──────────────────────────────────────────────────────── */}

      {/* INSTRUCTION_TEACHERS_PIVOT */}
      {view === "INSTRUCTION_TEACHERS_PIVOT" && (
        <div className="overflow-hidden rounded-2xl border border-white/60 bg-white/70 shadow-sm backdrop-blur-sm">
          <div className="flex items-center justify-between border-b border-border/30 bg-white/40 px-5 py-3">
            <div>
              <p className="text-[0.8125rem] font-semibold text-text">Teachers pivot</p>
              <p className="text-[0.75rem] text-muted">{teacherPivotRows.length} teacher{teacherPivotRows.length !== 1 ? "s" : ""} in scope · {windowDays}d window</p>
            </div>
            <ExportButton view={view} />
          </div>
          {teacherPivotRows.length === 0 ? (
            <Empty title="No teachers in scope" description="No teachers with observations in this window." />
          ) : (
            <div className="divide-y divide-border/20">
              {teacherPivotRows.map((row) => {
                // Compute signals sorted by delta (worst first)
                const signalEntries = signalKeys.map((k) => ({
                  key: k,
                  label: signalLabels.get(k) ?? k,
                  ...(row.signalData[k] ?? { currentMean: null, prevMean: null, delta: null, coverageCount: 0 }),
                }));
                const driftingDown = signalEntries.filter((s) => s.delta !== null && s.delta < 0).sort((a, b) => (a.delta as number) - (b.delta as number));
                const improving = signalEntries.filter((s) => s.delta !== null && s.delta > 0).sort((a, b) => (b.delta as number) - (a.delta as number));
                const noData = signalEntries.filter((s) => s.currentMean === null);

                return (
                  <div key={row.teacherMembershipId} className="group px-5 py-4 calm-transition hover:bg-white/50">
                    {/* Top row: teacher info + status */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={row.teacherName} size="sm" />
                          <div className="min-w-0">
                            <Link href={`/analysis/teachers/${row.teacherMembershipId}?window=${windowDays}`} className="text-[0.875rem] font-semibold text-text hover:text-accent calm-transition hover:underline">
                              {row.teacherName}
                            </Link>
                            <p className="text-xs text-muted">{row.departmentNames.join(", ") || "—"}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <p className="text-[0.6875rem] font-medium uppercase tracking-wide text-muted">Coverage</p>
                          <p className="text-sm tabular-nums font-semibold text-text">{row.teacherCoverage}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[0.6875rem] font-medium uppercase tracking-wide text-muted">Drift</p>
                          <p className={`text-sm tabular-nums font-semibold ${row.normalizedIDS > 0 ? "text-amber-700" : "text-text"}`}>{row.normalizedIDS.toFixed(1)}</p>
                        </div>
                        <StatusPill variant={STATUS_VARIANT[row.status]} size="sm">
                          {STATUS_LABELS[row.status]}
                        </StatusPill>
                      </div>
                    </div>

                    {/* Signal heatmap strip */}
                    <div className="mt-3 flex items-center gap-0.5" title="Signal scores: each cell = 1 signal. Colour shows current score level. Sorted best → worst.">
                      {signalEntries
                        .filter((s) => s.currentMean !== null)
                        .sort((a, b) => (b.currentMean ?? 0) - (a.currentMean ?? 0))
                        .map((s) => {
                          const mean = s.currentMean as number;
                          const deltaStr = s.delta !== null ? ` Δ${s.delta > 0 ? "+" : ""}${s.delta.toFixed(1)}` : "";
                          return (
                            <span
                              key={s.key}
                              className={`h-3 w-3 rounded-sm ${meanToBgColor(mean)} calm-transition`}
                              title={`${s.label}: ${mean.toFixed(1)}${deltaStr}`}
                            />
                          );
                        })}
                      {noData.length > 0 && (
                        <>
                          <span className="mx-0.5" />
                          {noData.map((s) => (
                            <span key={s.key} className="h-3 w-3 rounded-sm bg-slate-100 border border-slate-200" title={`${s.label}: no data`} />
                          ))}
                        </>
                      )}
                    </div>

                    {/* Drifting & improving signal chips */}
                    {(driftingDown.length > 0 || improving.length > 0) && (
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {driftingDown.slice(0, 4).map((s) => (
                          <span key={s.key} className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50/60 px-2 py-0.5 text-xs text-amber-800" title={`${s.label}: ${s.currentMean?.toFixed(1)} (Δ${(s.delta as number).toFixed(1)})`}>
                            <span className="font-medium">{truncateLabel(s.label)}</span>
                            <span className="tabular-nums">{s.currentMean?.toFixed(1)}</span>
                            <span className="tabular-nums text-amber-600">↓{Math.abs(s.delta as number).toFixed(1)}</span>
                          </span>
                        ))}
                        {improving.slice(0, 2).map((s) => (
                          <span key={s.key} className="inline-flex items-center gap-1 rounded-md border border-green-200 bg-green-50/60 px-2 py-0.5 text-xs text-green-800" title={`${s.label}: ${s.currentMean?.toFixed(1)} (Δ+${(s.delta as number).toFixed(1)})`}>
                            <span className="font-medium">{truncateLabel(s.label)}</span>
                            <span className="tabular-nums">{s.currentMean?.toFixed(1)}</span>
                            <span className="tabular-nums text-green-600">↑{(s.delta as number).toFixed(1)}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* INSTRUCTION_DEPARTMENTS_PIVOT */}
      {view === "INSTRUCTION_DEPARTMENTS_PIVOT" && (
        <div className="overflow-hidden rounded-2xl border border-white/60 bg-white/70 shadow-sm backdrop-blur-sm">
          <div className="flex items-center justify-between border-b border-border/30 bg-white/40 px-5 py-3">
            <div>
              <p className="text-[0.8125rem] font-semibold text-text">Departments pivot</p>
              <p className="text-[0.75rem] text-muted">{deptPivotRows.length} department{deptPivotRows.length !== 1 ? "s" : ""} in scope · {windowDays}d window</p>
            </div>
            <ExportButton view={view} />
          </div>
          {deptPivotRows.length === 0 ? (
            <Empty title="No departments in scope" description="No departments with data in this window." />
          ) : (
            <div className="divide-y divide-border/20">
              {deptPivotRows.map((row) => {
                const signalEntries = signalKeys.map((k) => ({
                  key: k,
                  label: signalLabels.get(k) ?? k,
                  ...(row.signalData[k] ?? { currentMean: null, prevMean: null, delta: null, coverageCount: 0 }),
                }));
                const driftingDown = signalEntries.filter((s) => s.delta !== null && s.delta < 0).sort((a, b) => (a.delta as number) - (b.delta as number));
                const improving = signalEntries.filter((s) => s.delta !== null && s.delta > 0).sort((a, b) => (b.delta as number) - (a.delta as number));
                const noData = signalEntries.filter((s) => s.currentMean === null);

                return (
                  <div key={row.departmentId} className="px-5 py-4 calm-transition hover:bg-white/50">
                    {/* Top row: department info + stats */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <Link href={`/scope?departmentId=${row.departmentId}&window=${windowDays}`} className="text-[0.875rem] font-semibold text-text hover:text-accent calm-transition hover:underline">
                          {row.departmentName}
                        </Link>
                      </div>
                      <div className="flex items-center gap-4 shrink-0 text-right">
                        <div>
                          <p className="text-[0.6875rem] font-medium uppercase tracking-wide text-muted">Teachers</p>
                          <p className="text-sm tabular-nums font-semibold text-text">{row.teacherCount}</p>
                        </div>
                        <div>
                          <p className="text-[0.6875rem] font-medium uppercase tracking-wide text-muted">Observations</p>
                          <p className="text-sm tabular-nums font-semibold text-text">{row.observationCount}</p>
                        </div>
                      </div>
                    </div>

                    {/* Signal heatmap strip */}
                    <div className="mt-3 flex items-center gap-0.5" title="Signal scores: each cell = 1 signal. Colour shows current score level.">
                      {signalEntries
                        .filter((s) => s.currentMean !== null)
                        .sort((a, b) => (b.currentMean ?? 0) - (a.currentMean ?? 0))
                        .map((s) => {
                          const mean = s.currentMean as number;
                          const deltaStr = s.delta !== null ? ` Δ${s.delta > 0 ? "+" : ""}${s.delta.toFixed(1)}` : "";
                          return (
                            <span
                              key={s.key}
                              className={`h-3 w-3 rounded-sm ${meanToBgColor(mean)} calm-transition`}
                              title={`${s.label}: ${mean.toFixed(1)}${deltaStr}`}
                            />
                          );
                        })}
                      {noData.length > 0 && (
                        <>
                          <span className="mx-0.5" />
                          {noData.map((s) => (
                            <span key={s.key} className="h-3 w-3 rounded-sm bg-slate-100 border border-slate-200" title={`${s.label}: no data`} />
                          ))}
                        </>
                      )}
                    </div>

                    {/* Drifting & improving signal chips */}
                    {(driftingDown.length > 0 || improving.length > 0) && (
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {driftingDown.slice(0, 4).map((s) => (
                          <span key={s.key} className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50/60 px-2 py-0.5 text-xs text-amber-800" title={`${s.label}: ${s.currentMean?.toFixed(1)} (Δ${(s.delta as number).toFixed(1)})`}>
                            <span className="font-medium">{truncateLabel(s.label)}</span>
                            <span className="tabular-nums">{s.currentMean?.toFixed(1)}</span>
                            <span className="tabular-nums text-amber-600">↓{Math.abs(s.delta as number).toFixed(1)}</span>
                          </span>
                        ))}
                        {improving.slice(0, 2).map((s) => (
                          <span key={s.key} className="inline-flex items-center gap-1 rounded-md border border-green-200 bg-green-50/60 px-2 py-0.5 text-xs text-green-800" title={`${s.label}: ${s.currentMean?.toFixed(1)} (Δ+${(s.delta as number).toFixed(1)})`}>
                            <span className="font-medium">{truncateLabel(s.label)}</span>
                            <span className="tabular-nums">{s.currentMean?.toFixed(1)}</span>
                            <span className="tabular-nums text-green-600">↑{(s.delta as number).toFixed(1)}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* INSTRUCTION_LIST */}
      {view === "INSTRUCTION_LIST" && (
        <div className="overflow-hidden rounded-2xl border border-white/60 bg-white/70 shadow-sm backdrop-blur-sm">
          <div className="flex items-center justify-between border-b border-border/30 bg-white/40 px-5 py-3">
            <div>
              <p className="text-[0.8125rem] font-semibold text-text">Observation list</p>
              <p className="text-[0.75rem] text-muted">{observationList.length} observation{observationList.length !== 1 ? "s" : ""} shown · {windowDays}d window</p>
            </div>
            <ExportButton view={view} />
          </div>
          {observationList.length === 0 ? (
            <Empty title="No observations found" description="Try adjusting your filters or expanding the window." />
          ) : (
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-border/20 bg-white/30 text-left text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-muted">
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
        </div>
      )}

      {/* TEACHER_PRIORITIES */}
      {view === "TEACHER_PRIORITIES" && (
        <div className="overflow-hidden rounded-2xl border border-white/60 bg-white/70 shadow-sm backdrop-blur-sm">
          <div className="flex items-center justify-between border-b border-border/30 bg-white/40 px-5 py-3">
            <div>
              <p className="text-[0.8125rem] font-semibold text-text">Teacher priorities</p>
              <p className="text-[0.75rem] text-muted">{teacherRiskRows.length} teacher{teacherRiskRows.length !== 1 ? "s" : ""} with data · {windowDays}d window</p>
            </div>
            <ExportButton view={view} />
          </div>
          {teacherRiskRows.length === 0 ? (
            <Empty title="No teacher data" description="No teachers have enough observation data in this window." />
          ) : (
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-border/20 bg-white/30 text-left text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-muted">
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
        </div>
      )}

      {/* CPD_SIGNALS */}
      {view === "CPD_SIGNALS" && (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-white/60 bg-white/70 shadow-sm backdrop-blur-sm">
            <div className="flex items-center justify-between border-b border-border/30 bg-white/40 px-5 py-3">
              <div>
                <p className="text-[0.8125rem] font-semibold text-text">CPD priority signals</p>
                <p className="text-[0.75rem] text-muted">Signals ranked by how commonly they are weakening across teachers · {windowDays}d window</p>
              </div>
              <ExportButton view={view} />
            </div>
            {cpdRows.length === 0 ? (
              <Empty title="No CPD data" description="Not enough eligible teachers in this window to compute priorities." />
            ) : (
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-border/20 bg-white/30 text-left text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-muted">
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
          </div>

          {cpdImprovingRows.length > 0 && (
            <div className="overflow-hidden rounded-2xl border border-white/60 bg-white/70 shadow-sm backdrop-blur-sm">
              <div className="border-b border-border/30 bg-white/40 px-5 py-3">
                <p className="text-[0.8125rem] font-semibold text-text">Positive momentum</p>
                <p className="text-[0.75rem] text-muted">Signals showing the strongest improvement across teachers</p>
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
            </div>
          )}
        </div>
      )}

      {/* BEHAVIOUR_STUDENTS_TABLE */}
      {view === "BEHAVIOUR_STUDENTS_TABLE" && (
        <div className="overflow-hidden rounded-2xl border border-white/60 bg-white/70 shadow-sm backdrop-blur-sm">
          <div className="flex items-center justify-between border-b border-border/30 bg-white/40 px-5 py-3">
            <div>
              <p className="text-[0.8125rem] font-semibold text-text">Student risk table</p>
              <p className="text-[0.75rem] text-muted">{studentRows.length} student{studentRows.length !== 1 ? "s" : ""} in scope · {windowDays}d window</p>
            </div>
            <ExportButton view={view} />
          </div>
          {studentRows.length === 0 ? (
            <Empty title="No students found" description="No students have snapshot data in this window." />
          ) : (
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-border/20 bg-white/30 text-left text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-muted">
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
        </div>
      )}

      {/* BEHAVIOUR_COHORTS_PIVOT */}
      {view === "BEHAVIOUR_COHORTS_PIVOT" && (
        <div className="overflow-hidden rounded-2xl border border-white/60 bg-white/70 shadow-sm backdrop-blur-sm">
          <div className="flex items-center justify-between border-b border-border/30 bg-white/40 px-5 py-3">
            <div>
              <p className="text-[0.8125rem] font-semibold text-text">Behaviour cohort pivot</p>
              <p className="text-[0.75rem] text-muted">{cohortRows.length} year group{cohortRows.length !== 1 ? "s" : ""} · {windowDays}d window</p>
            </div>
            <ExportButton view={view} />
          </div>
          {cohortRows.length === 0 ? (
            <Empty title="No cohort data" description="No cohort data is available in this window." />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/20 bg-white/30 text-left text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-muted">
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
        </div>
      )}

      <p className="text-[0.75rem] text-muted">Explorer · {windowDays}d window · {computedAtStr}</p>
    </div>
  );
}
