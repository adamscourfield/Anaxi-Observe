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
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      {/* Back link */}
      <Link
        href="/explorer"
        className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
      >
        ← Explorer
      </Link>

      <PageHeader
        title="Signals"
        subtitle="CPD priority signals ranked by how commonly they are weakening across teachers."
        meta={
          <span className="text-xs text-zinc-400">
            {windowDays}d window · {sortedRows.length} signal
            {sortedRows.length !== 1 ? "s" : ""}
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

        {/* Department filter */}
        <form className="flex items-end gap-2">
          <input type="hidden" name="windowDays" value={windowDays} />
          <label className="flex flex-col text-xs font-medium text-zinc-600 dark:text-zinc-300">
            Department
            <select
              name="departmentId"
              defaultValue={rawDeptId ?? ""}
              className="mt-1 rounded border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200"
            >
              <option value="">All departments</option>
              {selectableDepts.map((d: any) => (
                <option key={d.id} value={d.id}>
                  {d.name}
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
          {departmentId && (
            <Link
              href={buildUrl({ departmentId: undefined })}
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
            <input type="hidden" name="view" value="CPD_SIGNAL_PRIORITIES" />
            <input
              type="hidden"
              name="windowDays"
              value={String(windowDays)}
            />
            {departmentId && (
              <input type="hidden" name="departmentId" value={departmentId} />
            )}
            <button
              type="submit"
              className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
            >
              Export CSV
            </button>
          </form>
        )}
      </div>

      {/* ── Priority signals table ──────────────────────────────── */}
      <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">
              <th className="px-4 py-3">Signal</th>
              <th className="px-4 py-3 text-right">Teachers</th>
              <th className="px-4 py-3 text-right">Drifting</th>
              <th className="px-4 py-3 text-right">Drift rate</th>
              <th className="px-4 py-3 text-right">Avg drift</th>
              <th className="px-4 py-3 text-right">Priority</th>
              <th className="px-4 py-3 text-right">Improving</th>
              <th className="px-4 py-3 text-right">Improve rate</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {sortedRows.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-8 text-center text-zinc-400"
                >
                  No signal data for this window.
                </td>
              </tr>
            )}
            {sortedRows.map((row) => {
              const highlight = row.priorityScore > 0.1;
              return (
                <tr
                  key={row.signalKey}
                  className={
                    highlight
                      ? "bg-amber-50/50 dark:bg-amber-950/20"
                      : undefined
                  }
                >
                  <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100">
                    <Link
                      href={`/analysis/cpd/${encodeURIComponent(row.signalKey)}`}
                      className="hover:underline"
                    >
                      {row.label}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-zinc-700 dark:text-zinc-300">
                    {row.teachersCovered}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-zinc-700 dark:text-zinc-300">
                    {row.teachersDriftingDown}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-zinc-700 dark:text-zinc-300">
                    {pct(row.driftRate)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-zinc-700 dark:text-zinc-300">
                    {delta(row.avgNegDeltaAbs ? -row.avgNegDeltaAbs : null)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums font-semibold text-zinc-900 dark:text-zinc-100">
                    {row.priorityScore.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-emerald-700 dark:text-emerald-400">
                    {row.teachersImproving}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-emerald-700 dark:text-emerald-400">
                    {pct(row.improvingRate)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Positive momentum section ───────────────────────────── */}
      {improving.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Positive momentum
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {improving.map((row) => (
              <div
                key={row.signalKey}
                className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-800 dark:bg-emerald-950/30"
              >
                <h3 className="font-semibold text-emerald-900 dark:text-emerald-300">
                  <Link
                    href={`/analysis/cpd/${encodeURIComponent(row.signalKey)}`}
                    className="hover:underline"
                  >
                    {row.label}
                  </Link>
                </h3>
                <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm text-emerald-800 dark:text-emerald-400">
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
    </div>
  );
}
