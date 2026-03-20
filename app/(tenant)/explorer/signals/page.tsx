import Link from "next/link";
import { notFound } from "next/navigation";
import { getSessionUserOrThrow } from "@/lib/auth";
import { requireFeature } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { canViewExplorer, canExportExplorer } from "@/modules/authz";
import { PageHeader } from "@/components/ui/page-header";
import {
  computeCpdPriorities,
  getTopImprovingSignals,
} from "@/modules/analysis/cpdPriorities";
import type { CpdPriorityRow } from "@/modules/analysis/cpdPriorities";

const VALID_WINDOWS = [7, 21, 28] as const;
type WindowDays = (typeof VALID_WINDOWS)[number];

function parseWindow(raw: string | undefined): WindowDays {
  const n = Number(raw);
  return VALID_WINDOWS.includes(n as WindowDays) ? (n as WindowDays) : 21;
}

function pct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function delta(value: number | null): string {
  if (value === null) return "—";
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}`;
}

export default async function SignalsPage({
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

  if (!canViewExplorer(viewerContext)) return notFound();

  // ── params ──────────────────────────────────────────────────────
  const windowDays = parseWindow(
    Array.isArray(params.windowDays)
      ? params.windowDays[0]
      : params.windowDays,
  );
  const rawDeptId = Array.isArray(params.departmentId)
    ? params.departmentId[0]
    : params.departmentId;

  const isHod = user.role === "HOD";
  const scopeIds = isHod ? hodDepartmentIds : undefined;

  // Validate the department filter against HOD scope
  const departmentId =
    rawDeptId && (!isHod || hodDepartmentIds.includes(rawDeptId))
      ? rawDeptId
      : undefined;

  const filters = departmentId ? { departmentId } : undefined;

  // ── data ────────────────────────────────────────────────────────
  const [rows, departments] = await Promise.all([
    computeCpdPriorities(user.tenantId, windowDays, filters),
    (prisma as any).department.findMany({
      where: { tenantId: user.tenantId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const improving = getTopImprovingSignals(rows);
  const sortedRows = [...rows].sort(
    (a, b) => b.priorityScore - a.priorityScore,
  );

  const selectableDepts = isHod
    ? (departments as any[]).filter((d: any) =>
        hodDepartmentIds.includes(d.id),
      )
    : (departments as any[]);

  const showExport = canExportExplorer(viewerContext);

  // ── url builder ─────────────────────────────────────────────────
  function buildUrl(overrides: Record<string, string | undefined>) {
    const merged: Record<string, string> = {
      windowDays: String(windowDays),
      ...(departmentId ? { departmentId } : {}),
      ...Object.fromEntries(
        Object.entries(overrides).filter(
          (e): e is [string, string] => e[1] !== undefined,
        ),
      ),
    };
    // Remove keys explicitly set to undefined in overrides
    for (const [k, v] of Object.entries(overrides)) {
      if (v === undefined) delete merged[k];
    }
    const qs = new URLSearchParams(merged).toString();
    return `/explorer/signals${qs ? `?${qs}` : ""}`;
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
        title="Signals"
        subtitle="CPD priority signals ranked by how commonly they are weakening across teachers."
        meta={
          <span className="text-xs text-muted">
            {windowDays}d window · {sortedRows.length} signal
            {sortedRows.length !== 1 ? "s" : ""}
          </span>
        }
      />

      {/* ── Controls bar ────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-2xl border border-white/60 bg-white/60 backdrop-blur-sm">
        <div className="border-b border-border/30 px-5 py-3">
          <p className="text-[0.75rem] font-semibold uppercase tracking-[0.08em] text-muted">Filters</p>
        </div>
        <form className="flex flex-wrap items-end gap-3 p-4">
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

          {/* Department filter */}
          <label className="flex flex-col gap-1">
            <span className="text-[0.6875rem] font-medium text-muted">Department</span>
            <select
              name="departmentId"
              defaultValue={rawDeptId ?? ""}
              className="field min-w-[160px]"
            >
              <option value="">All departments</option>
              {selectableDepts.map((d: any) => (
                <option key={d.id} value={d.id}>
                  {d.name}
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
            {departmentId && (
              <Link
                href={buildUrl({ departmentId: undefined })}
                className="rounded-lg border border-border bg-white/70 px-4 py-2 text-[0.8125rem] font-medium text-muted calm-transition hover:text-text"
              >
                Clear
              </Link>
            )}
            {showExport && (
              <form action="/api/explorer/export" method="POST" className="inline">
                <input type="hidden" name="view" value="CPD_SIGNAL_PRIORITIES" />
                <input type="hidden" name="windowDays" value={String(windowDays)} />
                {departmentId && (
                  <input type="hidden" name="departmentId" value={departmentId} />
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
        </form>
      </div>

      {/* ── Result count ────────────────────────────────────────── */}
      <p className="mt-4 text-[0.8125rem] text-muted">
        {sortedRows.length > 0
          ? `${sortedRows.length} signal${sortedRows.length !== 1 ? "s" : ""} in the ${windowDays}-day window`
          : "No signal data for this window"}
      </p>

      {/* ── Priority signals table ──────────────────────────────── */}
      {sortedRows.length === 0 ? (
        <div className="mt-4 flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-accent/10">
            <svg className="h-6 w-6 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
            </svg>
          </div>
          <p className="text-[0.875rem] font-semibold text-text">No signals found</p>
          <p className="mt-1 text-[0.8125rem] text-muted">Try adjusting your window or department filter.</p>
        </div>
      ) : (
        <div className="mt-4 overflow-hidden rounded-2xl border border-white/60 bg-white/60 backdrop-blur-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/30 bg-white/40 text-left text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-muted">
                  <th className="px-5 py-3">Signal</th>
                  <th className="px-4 py-3 text-right">Teachers</th>
                  <th className="px-4 py-3 text-right">Drifting</th>
                  <th className="px-4 py-3 text-right">Drift rate</th>
                  <th className="px-4 py-3 text-right">Avg drift</th>
                  <th className="px-4 py-3 text-right">Priority</th>
                  <th className="px-4 py-3 text-right">Improving</th>
                  <th className="px-4 py-3 text-right">Improve rate</th>
                </tr>
              </thead>
              <tbody>
                {sortedRows.map((row) => {
                  const highlight = row.priorityScore > 0.1;
                  return (
                    <tr
                      key={row.signalKey}
                      className={`group border-b border-border/20 last:border-0 calm-transition hover:bg-white/50 ${
                        highlight ? "bg-amber-50/30" : ""
                      }`}
                    >
                      <td className="px-5 py-3 font-medium text-text">
                        <Link
                          href={`/analysis/cpd/${encodeURIComponent(row.signalKey)}`}
                          className="calm-transition group-hover:text-accent hover:underline"
                        >
                          {row.label}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-muted">
                        {row.teachersCovered}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-muted">
                        {row.teachersDriftingDown}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-muted">
                        {pct(row.driftRate)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-muted">
                        {delta(row.avgNegDeltaAbs ? -row.avgNegDeltaAbs : null)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-semibold text-text">
                        {row.priorityScore.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-success">
                        {row.teachersImproving}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-success">
                        {pct(row.improvingRate)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Positive momentum section ───────────────────────────── */}
      {improving.length > 0 && (
        <section className="mt-6 space-y-3">
          <h2 className="text-lg font-semibold text-text">
            Positive momentum
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {improving.map((row) => (
              <div
                key={row.signalKey}
                className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4"
              >
                <h3 className="font-semibold text-emerald-900">
                  <Link
                    href={`/analysis/cpd/${encodeURIComponent(row.signalKey)}`}
                    className="hover:underline"
                  >
                    {row.label}
                  </Link>
                </h3>
                <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm text-emerald-800">
                  <span>
                    <span className="font-medium">{row.teachersImproving}</span>{" "}
                    teacher{row.teachersImproving !== 1 ? "s" : ""} improving
                  </span>
                  <span>
                    Avg{" "}
                    <span className="font-medium">
                      {delta(row.avgPositiveDelta)}
                    </span>
                  </span>
                  <span>
                    Rate{" "}
                    <span className="font-medium">
                      {pct(row.improvingRate)}
                    </span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Footer ──────────────────────────────────────────────── */}
      <p className="mt-8 text-[0.75rem] text-muted">
        Explorer · Signals · {windowDays}d window
      </p>
    </>
  );
}
