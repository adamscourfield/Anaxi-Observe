import Link from "next/link";
import { notFound } from "next/navigation";
import { getSessionUserOrThrow } from "@/lib/auth";
import { requireFeature } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { canViewExplorer, canExportExplorer } from "@/modules/authz";
import { PageHeader } from "@/components/ui/page-header";
import {
  SIGNAL_DEFINITIONS,
  type SignalKey,
} from "@/modules/observations/signalDefinitions";
import {
  computeDepartmentPivot,
  type DepartmentPivotRow,
} from "@/modules/analysis/departmentPivot";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function meanToBgColor(mean: number): string {
  if (mean >= 3.5) return "bg-emerald-500";
  if (mean >= 2.5) return "bg-blue-500";
  if (mean >= 1.5) return "bg-amber-400";
  return "bg-rose-400";
}

function truncateLabel(label: string, max = 14): string {
  return label.length > max ? label.slice(0, max - 2) + "…" : label;
}

const WINDOW_OPTIONS = [7, 21, 28] as const;
type WindowDays = (typeof WINDOW_OPTIONS)[number];

function isValidWindow(v: unknown): v is WindowDays {
  return WINDOW_OPTIONS.includes(Number(v) as WindowDays);
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default async function DepartmentsPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  /* ---- Auth & feature gate ---- */
  const user = await getSessionUserOrThrow();
  await requireFeature(user.tenantId, "ANALYSIS");

  const [hodMemberships, coachAssignments] = await Promise.all([
    (prisma as any).departmentMembership.findMany({
      where: { userId: user.id, isHeadOfDepartment: true },
    }),
    (prisma as any).coachAssignment.findMany({
      where: { coachUserId: user.id },
    }),
  ]);

  const hodDepartmentIds = (hodMemberships as any[]).map(
    (m: any) => m.departmentId,
  );
  const coacheeUserIds = (coachAssignments as any[]).map(
    (a: any) => a.coacheeUserId,
  );
  const viewerContext = {
    userId: user.id,
    role: user.role,
    hodDepartmentIds,
    coacheeUserIds,
  };

  if (!canViewExplorer(viewerContext)) notFound();

  const showExport = canExportExplorer(viewerContext);

  /* ---- Search params ---- */
  const rawWindow = String(searchParams.windowDays ?? "21");
  const windowDays: WindowDays = isValidWindow(rawWindow)
    ? (Number(rawWindow) as WindowDays)
    : 21;

  const rawDeptId =
    typeof searchParams.departmentId === "string"
      ? searchParams.departmentId
      : undefined;

  const sortSignal =
    typeof searchParams.sortSignal === "string"
      ? searchParams.sortSignal
      : undefined;

  const sortDir =
    searchParams.sortDir === "asc" || searchParams.sortDir === "desc"
      ? searchParams.sortDir
      : "desc";

  /* ---- Scoping: HODs only see their departments ---- */
  const isHod = user.role === "HOD";
  const scopeIds = isHod ? hodDepartmentIds : undefined;
  const filterIds = rawDeptId ? [rawDeptId] : scopeIds;

  /* ---- Data ---- */
  const [{ rows }, departments] = await Promise.all([
    computeDepartmentPivot(user.tenantId, windowDays, filterIds),
    (prisma as any).department.findMany({
      where: { tenantId: user.tenantId },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }) as Promise<{ id: string; name: string }[]>,
  ]);

  /* HOD-scoped department list for the filter dropdown */
  const selectableDepts = isHod
    ? departments.filter((d) => hodDepartmentIds.includes(d.id))
    : departments;

  /* ---- Sorting ---- */
  let sortedRows: DepartmentPivotRow[] = [...rows];
  const signalKeys = SIGNAL_DEFINITIONS.map((s) => s.key);

  if (sortSignal && signalKeys.includes(sortSignal as SignalKey)) {
    sortedRows.sort((a, b) => {
      const da = a.signalData[sortSignal]?.delta ?? -Infinity;
      const db = b.signalData[sortSignal]?.delta ?? -Infinity;
      return sortDir === "asc" ? da - db : db - da;
    });
  } else {
    sortedRows.sort((a, b) => a.departmentName.localeCompare(b.departmentName));
  }

  /* ---- Summary stats ---- */
  const totalDepartments = sortedRows.length;
  const totalObservations = sortedRows.reduce(
    (sum, r) => sum + r.observationCount,
    0,
  );
  const coverageCounts = sortedRows.flatMap((r) =>
    Object.values(r.signalData).map((s) => s.coverageCount),
  );
  const avgCoverage =
    coverageCounts.length > 0
      ? (
          coverageCounts.reduce((a, b) => a + b, 0) / coverageCounts.length
        ).toFixed(1)
      : "0";

  /* ---- Derive drifting / improving chips per department ---- */
  function chipSets(row: DepartmentPivotRow) {
    const entries = Object.entries(row.signalData)
      .filter(([, v]) => v.delta !== null)
      .map(([key, v]) => {
        const def = SIGNAL_DEFINITIONS.find((s) => s.key === key);
        return { key, label: def?.displayNameDefault ?? key, delta: v.delta! };
      });

    const drifting = entries
      .filter((e) => e.delta < 0)
      .sort((a, b) => a.delta - b.delta)
      .slice(0, 4);

    const improving = entries
      .filter((e) => e.delta > 0)
      .sort((a, b) => b.delta - a.delta)
      .slice(0, 2);

    return { drifting, improving };
  }

  /* ---- URL helper for preserving params ---- */
  function buildUrl(overrides: Record<string, string | undefined>) {
    const params = new URLSearchParams();
    const merged: Record<string, string | undefined> = {
      windowDays: String(windowDays),
      departmentId: rawDeptId,
      sortSignal,
      sortDir,
      ...overrides,
    };
    for (const [k, v] of Object.entries(merged)) {
      if (v !== undefined && v !== "") params.set(k, v);
    }
    return `/explorer/departments?${params.toString()}`;
  }

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <>
      {/* Back link */}
      <div className="mb-4">
        <Link
          href="/explorer"
          className="inline-flex items-center gap-1.5 text-[0.8125rem] font-medium text-muted calm-transition hover:text-accent"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to Explorer
        </Link>
      </div>

      {/* Header */}
      <PageHeader
        title="Departments"
        subtitle="Department-level aggregated performance across all instructional signals."
        meta={`${totalDepartments} departments · ${totalObservations} observations · avg coverage ${avgCoverage}`}
      />

      {/* Controls row */}
      <div className="overflow-hidden rounded-2xl border border-white/60 bg-white/60 backdrop-blur-sm">
        <div className="border-b border-border/30 px-5 py-3">
          <p className="text-[0.75rem] font-semibold uppercase tracking-[0.08em] text-muted">Filters</p>
        </div>
        <div className="flex flex-wrap items-end gap-3 p-4">
          <form className="flex flex-wrap items-end gap-3">
            {sortSignal && (
              <input type="hidden" name="sortSignal" value={sortSignal} />
            )}
            {sortDir && (
              <input type="hidden" name="sortDir" value={sortDir} />
            )}

            {/* Window selector */}
            <label className="flex flex-col gap-1">
              <span className="text-[0.6875rem] font-medium text-muted">Window</span>
              <select name="windowDays" defaultValue={String(windowDays)} className="field min-w-[100px]">
                {WINDOW_OPTIONS.map((w) => (
                  <option key={w} value={String(w)}>
                    {w} days
                  </option>
                ))}
              </select>
            </label>

            {/* Department filter */}
            <label className="flex flex-col gap-1">
              <span className="text-[0.6875rem] font-medium text-muted">Department</span>
              <select
                name="departmentId"
                defaultValue={rawDeptId ?? ""}
                className="field min-w-[160px]"
              >
                <option value="">All departments</option>
                {selectableDepts.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="submit"
              className="rounded-lg bg-accent px-4 py-2 text-[0.8125rem] font-semibold text-white calm-transition hover:bg-accentHover"
            >
              Apply
            </button>
          </form>

          <Link
            href={buildUrl({ departmentId: undefined })}
            className="rounded-lg border border-border bg-white/70 px-4 py-2 text-[0.8125rem] font-medium text-muted calm-transition hover:text-text"
          >
            Clear
          </Link>
          {showExport && (
            <form action="/api/explorer/export" method="POST" className="inline">
              <input type="hidden" name="view" value="INSTRUCTION_DEPARTMENTS_PIVOT" />
              <input type="hidden" name="windowDays" value={String(windowDays)} />
              {rawDeptId && (
                <input type="hidden" name="departmentId" value={rawDeptId} />
              )}
              <button
                type="submit"
                className="rounded-lg border border-border bg-white/70 px-4 py-2 text-[0.8125rem] font-medium text-muted calm-transition hover:text-text"
              >
                Export CSV
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Signal column headers (scrollable) */}
      {sortedRows.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-accent/10">
            <svg className="h-6 w-6 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
              <circle cx="11" cy="11" r="6.5" />
              <path d="m16.5 16.5 3 3" strokeLinecap="round" />
            </svg>
          </div>
          <p className="text-[0.875rem] font-semibold text-text">No department data</p>
          <p className="mt-1 text-[0.8125rem] text-muted">Try widening the window period or adjusting filters.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-white/60 bg-white/60 backdrop-blur-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-b border-border/30 bg-white/40 text-left text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-muted">
                  <th className="px-5 py-3">Department</th>
                  <th className="px-4 py-3 text-right">Teachers</th>
                  <th className="px-4 py-3 text-right">Obs.</th>
                  {SIGNAL_DEFINITIONS.map((s) => {
                    const isActive = sortSignal === s.key;
                    const nextDir =
                      isActive && sortDir === "desc" ? "asc" : "desc";
                    return (
                      <th key={s.key} className="px-1 py-3 text-center">
                        <Link
                          href={buildUrl({
                            sortSignal: s.key,
                            sortDir: nextDir,
                          })}
                          className="calm-transition hover:text-text"
                          title={s.displayNameDefault}
                        >
                          {truncateLabel(s.displayNameDefault)}
                          {isActive && (sortDir === "desc" ? " ↓" : " ↑")}
                        </Link>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {sortedRows.map((row) => {
                  const { drifting, improving } = chipSets(row);
                  return (
                    <tr key={row.departmentId} className="group border-b border-border/20 last:border-0 calm-transition hover:bg-white/50">
                      {/* Department name + chips */}
                      <td className="space-y-1 px-5 py-3">
                        <span className="font-semibold text-text">
                          {row.departmentName}
                        </span>

                        {/* Chips row */}
                        <div className="flex flex-wrap gap-1">
                          {drifting.map((c) => (
                            <span
                              key={c.key}
                              className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800"
                              title={`${c.label}: ${c.delta > 0 ? "+" : ""}${c.delta.toFixed(2)}`}
                            >
                              {truncateLabel(c.label, 12)}
                            </span>
                          ))}
                          {improving.map((c) => (
                            <span
                              key={c.key}
                              className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-800"
                              title={`${c.label}: +${c.delta.toFixed(2)}`}
                            >
                              {truncateLabel(c.label, 12)}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Stats */}
                      <td className="px-4 py-3 text-right tabular-nums text-muted">
                        {row.teacherCount}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-muted">
                        {row.observationCount}
                      </td>

                      {/* Signal heatmap cells */}
                      {SIGNAL_DEFINITIONS.map((s) => {
                        const cell = row.signalData[s.key];
                        const mean = cell?.currentMean;
                        if (mean === null || mean === undefined) {
                          return (
                            <td key={s.key} className="px-1 py-3 text-center">
                              <span className="inline-block h-5 w-5 rounded bg-border" />
                            </td>
                          );
                        }
                        return (
                          <td key={s.key} className="px-1 py-3 text-center">
                            <span
                              className={`inline-block h-5 w-5 rounded ${meanToBgColor(mean)}`}
                              title={`${s.displayNameDefault}: ${mean.toFixed(2)}${cell?.delta != null ? ` (Δ ${cell.delta > 0 ? "+" : ""}${cell.delta.toFixed(2)})` : ""}`}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Footer ──────────────────────────────────────────────── */}
      <p className="mt-8 text-[0.75rem] text-muted">
        Explorer · Departments · {windowDays}d window
      </p>
    </>
  );
}
