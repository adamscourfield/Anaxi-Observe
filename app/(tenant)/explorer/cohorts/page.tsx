import Link from "next/link";
import { notFound } from "next/navigation";
import { getSessionUserOrThrow } from "@/lib/auth";
import { requireFeature } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import {
  canViewExplorer,
  canExportExplorer,
  canViewBehaviourExplorer,
} from "@/modules/authz";
import { PageHeader } from "@/components/ui/page-header";
import {
  computeCohortPivot,
  type CohortPivotRow,
} from "@/modules/analysis/cohortPivot";

/* ─── Constants ────────────────────────────────────────────────────────────── */

const VALID_WINDOWS = [7, 21, 28] as const;
type WindowDays = (typeof VALID_WINDOWS)[number];

/* ─── Helpers ──────────────────────────────────────────────────────────────── */

function parseWindow(raw: string | undefined): WindowDays {
  const n = Number(raw);
  return VALID_WINDOWS.includes(n as WindowDays) ? (n as WindowDays) : 21;
}

/**
 * Delta colour class.
 * `inverted` flips the meaning: for incident-type metrics a *positive* delta
 * is bad (more incidents), while for attendance a positive delta is good.
 */
function deltaClass(delta: number | null, inverted = false): string {
  if (delta === null) return "text-muted";
  if (delta === 0) return "text-muted";
  const isGood = inverted ? delta < 0 : delta > 0;
  return isGood ? "text-green-600" : "text-amber-600";
}

function fmtDelta(val: number | null, decimals = 2): string {
  if (val === null) return "—";
  return `${val > 0 ? "+" : ""}${val.toFixed(decimals)}`;
}

function fmtNum(val: number | null, decimals = 2): string {
  if (val === null) return "—";
  return val.toFixed(decimals);
}

/* ─── Page ─────────────────────────────────────────────────────────────────── */

export default async function CohortsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const user = await getSessionUserOrThrow();
  await requireFeature(user.tenantId, "ANALYSIS");

  // ── viewer context ──────────────────────────────────────────────
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

  if (
    !canViewExplorer(viewerContext) ||
    !canViewBehaviourExplorer(viewerContext)
  )
    notFound();

  // ── params ──────────────────────────────────────────────────────
  const windowDays = parseWindow(
    Array.isArray(params.windowDays)
      ? params.windowDays[0]
      : params.windowDays,
  );
  const yearGroupFilter =
    (Array.isArray(params.yearGroup)
      ? params.yearGroup[0]
      : params.yearGroup) ?? "";

  // ── data ────────────────────────────────────────────────────────
  const { rows: allRows, computedAt } = await computeCohortPivot(
    user.tenantId,
    windowDays,
  );

  // Available year groups (before filtering)
  const yearGroups = Array.from(
    new Set(allRows.map((r) => r.yearGroup)),
  ).sort();

  // Apply year-group filter
  let rows: CohortPivotRow[] = allRows;
  if (yearGroupFilter) {
    rows = rows.filter((r) => r.yearGroup === yearGroupFilter);
  }

  // ── summary ─────────────────────────────────────────────────────
  const totalStudents = rows.reduce((s, r) => s + r.studentsCovered, 0);
  const avgAttendance =
    rows.length > 0
      ? rows.reduce(
          (s, r) => s + (r.attendanceMean ?? 0) * r.studentsCovered,
          0,
        ) / (totalStudents || 1)
      : null;

  const showExport = canExportExplorer(viewerContext);
  const hasActiveFilters = !!yearGroupFilter;

  // ── url builder ─────────────────────────────────────────────────
  function buildUrl(overrides: Record<string, string | undefined>) {
    const merged: Record<string, string> = {
      windowDays: String(windowDays),
      ...(yearGroupFilter ? { yearGroup: yearGroupFilter } : {}),
      ...Object.fromEntries(
        Object.entries(overrides).filter(
          (e): e is [string, string] => e[1] !== undefined,
        ),
      ),
    };
    for (const [k, v] of Object.entries(overrides)) {
      if (v === undefined) delete merged[k];
    }
    const qs = new URLSearchParams(merged).toString();
    return `/explorer/cohorts${qs ? `?${qs}` : ""}`;
  }

  // ── render ──────────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      {/* Back link */}
      <Link
        href="/explorer"
        className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
      >
        ← Explorer
      </Link>

      <PageHeader
        title="Cohorts"
        subtitle="Year group behaviour metrics — attendance, incidents and welfare indicators aggregated by cohort."
        meta={
          <span className="text-xs text-zinc-400">
            {windowDays}d window · {allRows.length} cohort
            {allRows.length !== 1 ? "s" : ""} · Updated{" "}
            {computedAt.toLocaleDateString("en-GB")}
          </span>
        }
      />

      {/* ── Controls bar ────────────────────────────────────────── */}
      <div className="flex flex-wrap items-end gap-4">
        {/* Window selector */}
        <div className="flex items-center gap-1 rounded-lg border border-zinc-200 bg-white p-1 dark:border-zinc-700 dark:bg-zinc-800">
          {VALID_WINDOWS.map((w) => (
            <Link
              key={w}
              href={buildUrl({ windowDays: String(w) })}
              className={`rounded-md px-3 py-1 text-sm font-medium transition ${
                w === windowDays
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-700"
              }`}
            >
              {w}d
            </Link>
          ))}
        </div>

        {/* Year group filter */}
        <form className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="windowDays" value={windowDays} />

          <label className="flex flex-col text-xs font-medium text-zinc-600 dark:text-zinc-300">
            Year group
            <select
              name="yearGroup"
              defaultValue={yearGroupFilter}
              className="mt-1 rounded border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200"
            >
              <option value="">All years</option>
              {yearGroups.map((yg) => (
                <option key={yg} value={yg}>
                  {yg}
                </option>
              ))}
            </select>
          </label>

          <button
            type="submit"
            className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
          >
            Apply
          </button>

          {hasActiveFilters && (
            <Link
              href={buildUrl({ yearGroup: undefined })}
              className="text-xs text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
            >
              Clear
            </Link>
          )}
        </form>

        {/* Export */}
        {showExport && (
          <form
            action="/api/explorer/export"
            method="POST"
            className="ml-auto"
          >
            <input type="hidden" name="view" value="COHORT_PIVOT" />
            <input
              type="hidden"
              name="windowDays"
              value={String(windowDays)}
            />
            <button
              type="submit"
              className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
            >
              Export CSV
            </button>
          </form>
        )}
      </div>

      {/* ── Summary row ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            Total students
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-zinc-900 dark:text-zinc-100">
            {totalStudents}
          </p>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            Avg attendance
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-zinc-900 dark:text-zinc-100">
            {avgAttendance !== null ? `${avgAttendance.toFixed(1)}%` : "—"}
          </p>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            Cohorts
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-zinc-900 dark:text-zinc-100">
            {rows.length}
          </p>
        </div>
      </div>

      {/* ── Cohort pivot table ──────────────────────────────────── */}
      <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">
              <th className="px-4 py-3">Year Group</th>
              <th className="px-4 py-3 text-right">Students</th>
              <th className="px-4 py-3 text-right">Attendance</th>
              <th className="px-4 py-3 text-right">Detentions</th>
              <th className="px-4 py-3 text-right">On Calls</th>
              <th className="px-4 py-3 text-right">Lateness</th>
              <th className="px-4 py-3 text-right">Suspensions</th>
              <th className="px-4 py-3 text-right">Exclusions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-12 text-center text-zinc-400"
                >
                  {allRows.length === 0
                    ? "No cohort data available for this window."
                    : "No cohorts match the current filter."}
                </td>
              </tr>
            )}
            {rows.map((row) => (
              <tr
                key={row.yearGroup}
                className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
              >
                {/* Year Group (linked) */}
                <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100">
                  <Link
                    href={`/analysis/students?yearGroup=${encodeURIComponent(row.yearGroup)}&window=${windowDays}`}
                    className="hover:underline"
                  >
                    {row.yearGroup}
                  </Link>
                </td>

                {/* Students */}
                <td className="px-4 py-3 text-right tabular-nums text-zinc-700 dark:text-zinc-300">
                  {row.studentsCovered}
                </td>

                {/* Attendance — positive delta = improving (good) */}
                <td className="px-4 py-3 text-right tabular-nums text-zinc-700 dark:text-zinc-300">
                  {fmtNum(row.attendanceMean, 1)}%{" "}
                  <span className={deltaClass(row.attendanceDelta)}>
                    ({fmtDelta(row.attendanceDelta, 1)})
                  </span>
                </td>

                {/* Detentions — positive delta = worsening (inverted) */}
                <td className="px-4 py-3 text-right tabular-nums text-zinc-700 dark:text-zinc-300">
                  {fmtNum(row.detentionsMean)}{" "}
                  <span
                    className={deltaClass(row.detentionsDelta, true)}
                  >
                    ({fmtDelta(row.detentionsDelta)})
                  </span>
                </td>

                {/* On Calls — positive delta = worsening (inverted) */}
                <td className="px-4 py-3 text-right tabular-nums text-zinc-700 dark:text-zinc-300">
                  {fmtNum(row.onCallsMean)}{" "}
                  <span
                    className={deltaClass(row.onCallsDelta, true)}
                  >
                    ({fmtDelta(row.onCallsDelta)})
                  </span>
                </td>

                {/* Lateness — positive delta = worsening (inverted) */}
                <td className="px-4 py-3 text-right tabular-nums text-zinc-700 dark:text-zinc-300">
                  {fmtNum(row.latenessMean)}{" "}
                  <span
                    className={deltaClass(row.latenessDelta, true)}
                  >
                    ({fmtDelta(row.latenessDelta)})
                  </span>
                </td>

                {/* Suspensions — positive delta = worsening (inverted) */}
                <td className="px-4 py-3 text-right tabular-nums text-zinc-700 dark:text-zinc-300">
                  {row.suspensionsCount}{" "}
                  <span
                    className={deltaClass(row.suspensionsDelta, true)}
                  >
                    ({fmtDelta(row.suspensionsDelta, 0)})
                  </span>
                </td>

                {/* Internal Exclusions — positive delta = worsening (inverted) */}
                <td className="px-4 py-3 text-right tabular-nums text-zinc-700 dark:text-zinc-300">
                  {row.internalExclusionsCount}{" "}
                  <span
                    className={deltaClass(
                      row.internalExclusionsDelta,
                      true,
                    )}
                  >
                    ({fmtDelta(row.internalExclusionsDelta, 0)})
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
