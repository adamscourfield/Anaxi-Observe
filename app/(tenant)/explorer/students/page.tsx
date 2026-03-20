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
import { StatusPill, type PillVariant } from "@/components/ui/status-pill";
import {
  computeStudentRiskIndex,
  type RiskBand,
  type StudentRiskRow,
} from "@/modules/analysis/studentRisk";

/* ─── Constants ────────────────────────────────────────────────────────────── */

const VALID_WINDOWS = [7, 21, 28] as const;
type WindowDays = (typeof VALID_WINDOWS)[number];

const BAND_ORDER: RiskBand[] = ["URGENT", "PRIORITY", "WATCH", "STABLE"];

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

const BAND_CARD_STYLES: Record<RiskBand, string> = {
  URGENT:
    "border-rose-200 bg-rose-50/60 dark:border-rose-800 dark:bg-rose-950/30",
  PRIORITY:
    "border-amber-200 bg-amber-50/60 dark:border-amber-800 dark:bg-amber-950/30",
  WATCH:
    "border-blue-200 bg-blue-50/60 dark:border-blue-800 dark:bg-blue-950/30",
  STABLE:
    "border-emerald-200 bg-emerald-50/60 dark:border-emerald-800 dark:bg-emerald-950/30",
};

const BAND_CARD_TEXT: Record<RiskBand, string> = {
  URGENT: "text-rose-900 dark:text-rose-300",
  PRIORITY: "text-amber-900 dark:text-amber-300",
  WATCH: "text-blue-900 dark:text-blue-300",
  STABLE: "text-emerald-900 dark:text-emerald-300",
};

/* ─── Helpers ──────────────────────────────────────────────────────────────── */

function parseWindow(raw: string | undefined): WindowDays {
  const n = Number(raw);
  return VALID_WINDOWS.includes(n as WindowDays) ? (n as WindowDays) : 21;
}

function fmtPct(value: number | null): string {
  if (value === null) return "—";
  return `${value.toFixed(1)}%`;
}

function fmtDelta(value: number | null): string {
  if (value === null) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value}`;
}

/* ─── Page ─────────────────────────────────────────────────────────────────── */

export default async function StudentsPage({
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

  if (!canViewExplorer(viewerContext) || !canViewBehaviourExplorer(viewerContext))
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
  const studentSearch =
    (Array.isArray(params.studentSearch)
      ? params.studentSearch[0]
      : params.studentSearch) ?? "";
  const bandFilter =
    (Array.isArray(params.band) ? params.band[0] : params.band) ?? "";

  // ── data ────────────────────────────────────────────────────────
  const { rows: allRows, computedAt } = await computeStudentRiskIndex(
    user.tenantId,
    windowDays,
    user.id,
  );

  // Collect available year groups before filtering
  const yearGroups = Array.from(
    new Set(allRows.map((r) => r.yearGroup).filter(Boolean)),
  ).sort() as string[];

  // Apply filters
  let rows = allRows;
  if (yearGroupFilter) {
    rows = rows.filter((r) => r.yearGroup === yearGroupFilter);
  }
  if (studentSearch) {
    const q = studentSearch.toLowerCase();
    rows = rows.filter((r) => r.studentName.toLowerCase().includes(q));
  }
  if (bandFilter && BAND_ORDER.includes(bandFilter as RiskBand)) {
    rows = rows.filter((r) => r.band === bandFilter);
  }

  // Sort: Urgent first, then by risk score descending
  rows.sort((a, b) => {
    const bandDiff = BAND_ORDER.indexOf(a.band) - BAND_ORDER.indexOf(b.band);
    if (bandDiff !== 0) return bandDiff;
    return b.riskScore - a.riskScore;
  });

  // Band counts (from unfiltered data)
  const bandCounts: Record<RiskBand, number> = {
    URGENT: 0,
    PRIORITY: 0,
    WATCH: 0,
    STABLE: 0,
  };
  for (const r of allRows) bandCounts[r.band]++;

  const showExport = canExportExplorer(viewerContext);
  const hasActiveFilters = !!(yearGroupFilter || studentSearch || bandFilter);

  // ── url builder ─────────────────────────────────────────────────
  function buildUrl(overrides: Record<string, string | undefined>) {
    const merged: Record<string, string> = {
      windowDays: String(windowDays),
      ...(yearGroupFilter ? { yearGroup: yearGroupFilter } : {}),
      ...(studentSearch ? { studentSearch } : {}),
      ...(bandFilter ? { band: bandFilter } : {}),
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
    return `/explorer/students${qs ? `?${qs}` : ""}`;
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
        title="Students"
        subtitle="Student risk analysis based on attendance, behaviour incidents and welfare signals."
        meta={
          <span className="text-xs text-zinc-400">
            {windowDays}d window · {allRows.length} student
            {allRows.length !== 1 ? "s" : ""} · Updated{" "}
            {computedAt.toLocaleDateString("en-GB")}
          </span>
        }
      />

      {/* ── Summary band cards ──────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {BAND_ORDER.map((band) => (
          <div
            key={band}
            className={`rounded-lg border p-4 ${BAND_CARD_STYLES[band]}`}
          >
            <p
              className={`text-sm font-medium ${BAND_CARD_TEXT[band]}`}
            >
              {BAND_LABELS[band]}
            </p>
            <p
              className={`mt-1 text-2xl font-bold tabular-nums ${BAND_CARD_TEXT[band]}`}
            >
              {bandCounts[band]}
            </p>
          </div>
        ))}
      </div>

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

        {/* Filters */}
        <form className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="windowDays" value={windowDays} />

          {/* Year group dropdown */}
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

          {/* Student search */}
          <label className="flex flex-col text-xs font-medium text-zinc-600 dark:text-zinc-300">
            Student
            <input
              type="text"
              name="studentSearch"
              defaultValue={studentSearch}
              placeholder="Search by name…"
              className="mt-1 rounded border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200"
            />
          </label>

          {/* Band filter dropdown */}
          <label className="flex flex-col text-xs font-medium text-zinc-600 dark:text-zinc-300">
            Risk band
            <select
              name="band"
              defaultValue={bandFilter}
              className="mt-1 rounded border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200"
            >
              <option value="">All bands</option>
              {BAND_ORDER.map((b) => (
                <option key={b} value={b}>
                  {BAND_LABELS[b]}
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
              href={buildUrl({
                yearGroup: undefined,
                studentSearch: undefined,
                band: undefined,
              })}
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
            <input type="hidden" name="view" value="STUDENT_RISK" />
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

      {/* ── Student risk table ──────────────────────────────────── */}
      <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">
              <th className="px-4 py-3">Student</th>
              <th className="px-4 py-3">Year</th>
              <th className="px-4 py-3">Band</th>
              <th className="px-4 py-3">Drivers</th>
              <th className="px-4 py-3 text-right">Attendance %</th>
              <th className="px-4 py-3 text-right">Detentions Δ</th>
              <th className="px-4 py-3 text-right">On Calls Δ</th>
              <th className="px-4 py-3 text-right">Lateness Δ</th>
              <th className="px-4 py-3">Flags</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={9}
                  className="px-4 py-12 text-center text-zinc-400"
                >
                  {allRows.length === 0
                    ? "No student risk data available for this window."
                    : "No students match the current filters."}
                </td>
              </tr>
            )}
            {rows.map((row) => (
              <tr key={row.studentId} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100">
                  <Link
                    href={`/analysis/students/${row.studentId}?window=${windowDays}`}
                    className="hover:underline"
                  >
                    {row.studentName}
                  </Link>
                </td>
                <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                  {row.yearGroup ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <StatusPill variant={BAND_VARIANT[row.band]} size="sm">
                    {BAND_LABELS[row.band]}
                  </StatusPill>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {row.drivers.map((d) => (
                      <span
                        key={d.metric}
                        className="inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300"
                      >
                        {d.direction === "up" ? "↑" : "↓"} {d.label}
                      </span>
                    ))}
                    {row.drivers.length === 0 && (
                      <span className="text-xs text-zinc-400">—</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-zinc-700 dark:text-zinc-300">
                  {fmtPct(row.attendancePct)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-zinc-700 dark:text-zinc-300">
                  {fmtDelta(row.detentionsDelta)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-zinc-700 dark:text-zinc-300">
                  {fmtDelta(row.onCallsDelta)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-zinc-700 dark:text-zinc-300">
                  {fmtDelta(row.latenessDelta)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    {row.sendFlag && (
                      <StatusPill variant="accent" size="sm">
                        SEND
                      </StatusPill>
                    )}
                    {row.ppFlag && (
                      <StatusPill variant="info" size="sm">
                        PP
                      </StatusPill>
                    )}
                    {!row.sendFlag && !row.ppFlag && (
                      <span className="text-xs text-zinc-400">—</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
