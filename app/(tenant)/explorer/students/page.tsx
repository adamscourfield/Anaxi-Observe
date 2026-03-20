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
  URGENT:   "border-rose-200 bg-rose-50/60",
  PRIORITY: "border-amber-200 bg-amber-50/60",
  WATCH:    "border-blue-200 bg-blue-50/60",
  STABLE:   "border-emerald-200 bg-emerald-50/60",
};

const BAND_CARD_TEXT: Record<RiskBand, string> = {
  URGENT:   "text-rose-900",
  PRIORITY: "text-amber-900",
  WATCH:    "text-blue-900",
  STABLE:   "text-emerald-900",
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

      <PageHeader
        title="Students"
        subtitle="Student risk analysis based on attendance, behaviour incidents and welfare signals."
        meta={
          <span className="text-xs text-muted">
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
            className={`rounded-2xl border p-4 ${BAND_CARD_STYLES[band]}`}
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
      <div className="overflow-hidden rounded-2xl border border-white/60 bg-white/60 backdrop-blur-sm">
        <div className="border-b border-border/30 px-5 py-3">
          <p className="text-[0.75rem] font-semibold uppercase tracking-[0.08em] text-muted">Filters</p>
        </div>
        <form className="flex flex-wrap items-end gap-3 p-4">
          <input type="hidden" name="windowDays" value={windowDays} />

          {/* Window selector */}
          <label className="flex flex-col gap-1">
            <span className="text-[0.6875rem] font-medium text-muted">Window</span>
            <select name="windowDays" defaultValue={String(windowDays)} className="field min-w-[100px]">
              {VALID_WINDOWS.map((w) => (
                <option key={w} value={String(w)}>
                  {w} days
                </option>
              ))}
            </select>
          </label>

          {/* Year group dropdown */}
          <label className="flex flex-col gap-1">
            <span className="text-[0.6875rem] font-medium text-muted">Year group</span>
            <select
              name="yearGroup"
              defaultValue={yearGroupFilter}
              className="field min-w-[120px]"
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
          <label className="flex flex-col gap-1">
            <span className="text-[0.6875rem] font-medium text-muted">Student</span>
            <input
              type="text"
              name="studentSearch"
              defaultValue={studentSearch}
              placeholder="Search by name…"
              className="field min-w-[160px]"
            />
          </label>

          {/* Band filter dropdown */}
          <label className="flex flex-col gap-1">
            <span className="text-[0.6875rem] font-medium text-muted">Risk band</span>
            <select
              name="band"
              defaultValue={bandFilter}
              className="field min-w-[120px]"
            >
              <option value="">All bands</option>
              {BAND_ORDER.map((b) => (
                <option key={b} value={b}>
                  {BAND_LABELS[b]}
                </option>
              ))}
            </select>
          </label>

          {/* Buttons */}
          <div className="flex items-end gap-2">
            <button
              type="submit"
              className="rounded-lg bg-accent px-4 py-2 text-[0.8125rem] font-semibold text-white calm-transition hover:bg-accentHover"
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
                className="rounded-lg border border-border bg-white/70 px-4 py-2 text-[0.8125rem] font-medium text-muted calm-transition hover:text-text"
              >
                Clear
              </Link>
            )}
            {showExport && (
              <form action="/api/explorer/export" method="POST" className="inline">
                <input type="hidden" name="view" value="STUDENT_RISK" />
                <input type="hidden" name="windowDays" value={String(windowDays)} />
                <button
                  type="submit"
                  className="rounded-lg border border-border bg-white/70 px-4 py-2 text-[0.8125rem] font-medium text-muted calm-transition hover:text-text"
                >
                  Export CSV
                </button>
              </form>
            )}
          </div>
        </form>
      </div>

      {/* ── Result count ────────────────────────────────────────── */}
      <p className="mt-4 text-[0.8125rem] text-muted">
        {rows.length > 0
          ? `${rows.length} student${rows.length !== 1 ? "s" : ""} in the ${windowDays}-day window`
          : allRows.length === 0
            ? "No student risk data available for this window"
            : "No students match the current filters"}
      </p>

      {/* ── Student risk table ──────────────────────────────────── */}
      {rows.length === 0 ? (
        <div className="mt-4 flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-accent/10">
            <svg className="h-6 w-6 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
              <circle cx="11" cy="11" r="6.5" />
              <path d="m16.5 16.5 3 3" strokeLinecap="round" />
            </svg>
          </div>
          <p className="text-[0.875rem] font-semibold text-text">
            {allRows.length === 0 ? "No student data" : "No matches"}
          </p>
          <p className="mt-1 text-[0.8125rem] text-muted">
            {allRows.length === 0
              ? "Try widening the window period."
              : "Try adjusting your filters."}
          </p>
        </div>
      ) : (
        <div className="mt-4 overflow-hidden rounded-2xl border border-white/60 bg-white/60 backdrop-blur-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/30 bg-white/40 text-left text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-muted">
                  <th className="px-5 py-3">Student</th>
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
              <tbody>
                {rows.map((row) => (
                  <tr key={row.studentId} className="group border-b border-border/20 last:border-0 calm-transition hover:bg-white/50">
                    <td className="px-5 py-3 font-medium text-text">
                      <Link
                        href={`/analysis/students/${row.studentId}?window=${windowDays}`}
                        className="calm-transition group-hover:text-accent hover:underline"
                      >
                        {row.studentName}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted">
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
                            className="inline-flex items-center rounded-full bg-bg px-2 py-0.5 text-xs font-medium text-text"
                          >
                            {d.direction === "up" ? "↑" : "↓"} {d.label}
                          </span>
                        ))}
                        {row.drivers.length === 0 && (
                          <span className="text-xs text-muted">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted">
                      {fmtPct(row.attendancePct)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted">
                      {fmtDelta(row.detentionsDelta)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted">
                      {fmtDelta(row.onCallsDelta)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted">
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
                          <span className="text-xs text-muted">—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Footer ──────────────────────────────────────────────── */}
      <p className="mt-8 text-[0.75rem] text-muted">
        Explorer · Students · {windowDays}d window
      </p>
    </>
  );
}
