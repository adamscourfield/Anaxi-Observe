import Link from "next/link";
import { notFound } from "next/navigation";
import { getSessionUserOrThrow } from "@/lib/auth";
import { requireFeature } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { canViewExplorer, canExportExplorer } from "@/modules/authz";
import { PageHeader } from "@/components/ui/page-header";
import { StatusPill, type PillVariant } from "@/components/ui/status-pill";
import { Avatar } from "@/components/ui/avatar";
import { SIGNAL_DEFINITIONS } from "@/modules/observations/signalDefinitions";
import {
  computeTeacherPivot,
  computeTeacherRiskIndex,
  type RiskStatus,
  type TeacherPivotRow,
  type TeacherRiskRow,
} from "@/modules/analysis/teacherRisk";

/* ─── Helpers ──────────────────────────────────────────────────────────────── */

function meanToBgColor(mean: number): string {
  if (mean >= 3.5) return "bg-emerald-500";
  if (mean >= 2.5) return "bg-blue-500";
  if (mean >= 1.5) return "bg-amber-400";
  return "bg-rose-400";
}

function truncateLabel(label: string, max = 14): string {
  return label.length > max ? label.slice(0, max - 2) + "…" : label;
}

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

const VALID_WINDOWS = [7, 21, 28] as const;
type WindowDays = (typeof VALID_WINDOWS)[number];

const SIGNAL_KEYS = SIGNAL_DEFINITIONS.map((s) => s.key);
const SIGNAL_LABEL_MAP: Record<string, string> = Object.fromEntries(
  SIGNAL_DEFINITIONS.map((s) => [s.key, s.displayNameDefault]),
);

/* ─── Page ─────────────────────────────────────────────────────────────────── */

export default async function ExplorerTeachersPage({
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

  // ─── Parse search params ────────────────────────────────────────────────────
  const rawWindow = Number(
    typeof searchParams?.windowDays === "string" ? searchParams.windowDays : "21",
  );
  const windowDays: WindowDays = VALID_WINDOWS.includes(rawWindow as WindowDays)
    ? (rawWindow as WindowDays)
    : 21;

  const mode =
    typeof searchParams?.mode === "string" && searchParams.mode === "priorities"
      ? "priorities"
      : "pivot";

  const sort =
    typeof searchParams?.sort === "string" &&
    ["drift", "coverage", "name"].includes(searchParams.sort)
      ? (searchParams.sort as "drift" | "coverage" | "name")
      : "drift";

  const dir =
    typeof searchParams?.dir === "string" && ["asc", "desc"].includes(searchParams.dir)
      ? (searchParams.dir as "asc" | "desc")
      : "desc";

  const departmentId =
    typeof searchParams?.departmentId === "string" ? searchParams.departmentId : undefined;

  // ─── Load departments for filter ────────────────────────────────────────────
  const departments: { id: string; name: string }[] = await (prisma as any).department.findMany({
    where: { tenantId: user.tenantId },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  // ─── HOD scope: restrict departments to those the HOD leads ─────────────────
  const isHod = user.role === "HOD";
  const scopedDepartments = isHod
    ? departments.filter((d) => hodDepartmentIds.includes(d.id))
    : departments;

  // ─── Fetch data ─────────────────────────────────────────────────────────────
  let pivotRows: TeacherPivotRow[] = [];
  let riskRows: TeacherRiskRow[] = [];
  let computedAt: Date = new Date();

  if (mode === "pivot") {
    const result = await computeTeacherPivot(user.tenantId, windowDays);
    pivotRows = result.rows;
    computedAt = result.computedAt;
  } else {
    riskRows = await computeTeacherRiskIndex(user.tenantId, windowDays);
  }

  // ─── HOD scope filter ───────────────────────────────────────────────────────
  if (isHod && hodDepartmentIds.length > 0) {
    const hodDeptNameSet = new Set(
      scopedDepartments.map((d) => d.name),
    );
    if (mode === "pivot") {
      pivotRows = pivotRows.filter((r) =>
        r.departmentNames.some((dn) => hodDeptNameSet.has(dn)),
      );
    } else {
      riskRows = riskRows.filter((r) =>
        r.departmentNames.some((dn) => hodDeptNameSet.has(dn)),
      );
    }
  }

  // ─── Department filter ──────────────────────────────────────────────────────
  if (departmentId) {
    const dept = departments.find((d) => d.id === departmentId);
    if (dept) {
      if (mode === "pivot") {
        pivotRows = pivotRows.filter((r) => r.departmentNames.includes(dept.name));
      } else {
        riskRows = riskRows.filter((r) => r.departmentNames.includes(dept.name));
      }
    }
  }

  // ─── Sorting (pivot mode) ──────────────────────────────────────────────────
  if (mode === "pivot") {
    const multiplier = dir === "asc" ? 1 : -1;
    pivotRows.sort((a, b) => {
      if (sort === "drift") return (a.normalizedIDS - b.normalizedIDS) * multiplier;
      if (sort === "coverage") return (a.teacherCoverage - b.teacherCoverage) * multiplier;
      return a.teacherName.localeCompare(b.teacherName) * multiplier;
    });
  }

  // ─── Sorting (priorities mode) ─────────────────────────────────────────────
  if (mode === "priorities") {
    const multiplier = dir === "asc" ? 1 : -1;
    riskRows.sort((a, b) => {
      if (sort === "drift") return (a.normalizedIDS - b.normalizedIDS) * multiplier;
      if (sort === "coverage") return (a.teacherCoverage - b.teacherCoverage) * multiplier;
      return a.teacherName.localeCompare(b.teacherName) * multiplier;
    });
  }

  const canExport = canExportExplorer(viewerContext);

  // ─── URL builder helpers ────────────────────────────────────────────────────
  function buildUrl(overrides: Record<string, string>) {
    const base: Record<string, string> = {
      windowDays: String(windowDays),
      mode,
      sort,
      dir,
    };
    if (departmentId) base.departmentId = departmentId;
    const merged = { ...base, ...overrides };
    const qs = new URLSearchParams(merged).toString();
    return `/explorer/teachers?${qs}`;
  }

  function sortUrl(column: string) {
    const newDir = sort === column && dir === "desc" ? "asc" : "desc";
    return buildUrl({ sort: column, dir: newDir });
  }

  function sortIndicator(column: string) {
    if (sort !== column) return "";
    return dir === "asc" ? " ↑" : " ↓";
  }

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      {/* Back link */}
      <Link
        href="/explorer"
        className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
      >
        ← Explorer
      </Link>

      {/* Page header */}
      <PageHeader
        title="Teachers"
        subtitle="Teacher-level performance, drift analysis and signal breakdowns."
      />

      {/* ── Controls bar ────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-4">
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

        {/* Mode toggle */}
        <div className="flex items-center gap-1 rounded-lg border border-zinc-200 bg-white p-1 dark:border-zinc-700 dark:bg-zinc-800">
          <Link
            href={buildUrl({ mode: "pivot" })}
            className={`rounded-md px-3 py-1 text-sm font-medium transition ${
              mode === "pivot"
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-700"
            }`}
          >
            Performance view
          </Link>
          <Link
            href={buildUrl({ mode: "priorities" })}
            className={`rounded-md px-3 py-1 text-sm font-medium transition ${
              mode === "priorities"
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-700"
            }`}
          >
            Priority view
          </Link>
        </div>

        {/* Department filter */}
        <form className="flex items-center gap-2" method="GET" action="/explorer/teachers">
          <input type="hidden" name="windowDays" value={String(windowDays)} />
          <input type="hidden" name="mode" value={mode} />
          <input type="hidden" name="sort" value={sort} />
          <input type="hidden" name="dir" value={dir} />
          <select
            name="departmentId"
            defaultValue={departmentId ?? ""}
            className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200"
          >
            <option value="">All departments</option>
            {scopedDepartments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            Apply
          </button>
          {departmentId && (
            <Link
              href={buildUrl({ departmentId: "" })}
              className="text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
            >
              Clear
            </Link>
          )}
        </form>

        {/* Export button */}
        {canExport && (
          <form action="/api/explorer/export" method="POST" className="ml-auto">
            <input
              type="hidden"
              name="view"
              value={mode === "pivot" ? "INSTRUCTION_TEACHERS_PIVOT" : "TEACHER_PRIORITIES"}
            />
            <input type="hidden" name="windowDays" value={String(windowDays)} />
            {departmentId && <input type="hidden" name="departmentId" value={departmentId} />}
            <button
              type="submit"
              className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
            >
              Export CSV
            </button>
          </form>
        )}
      </div>

      {/* ── Performance view (pivot) ────────────────────────────────────────── */}
      {mode === "pivot" && (
        <div className="space-y-3">
          {/* Column header row */}
          <div className="hidden items-center gap-4 border-b border-zinc-200 px-4 pb-2 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:border-zinc-700 dark:text-zinc-400 sm:flex">
            <Link href={sortUrl("name")} className="w-56 hover:text-zinc-700 dark:hover:text-zinc-200">
              Teacher{sortIndicator("name")}
            </Link>
            <span className="w-32">Department</span>
            <Link href={sortUrl("coverage")} className="w-20 text-right hover:text-zinc-700 dark:hover:text-zinc-200">
              Coverage{sortIndicator("coverage")}
            </Link>
            <Link href={sortUrl("drift")} className="w-20 text-right hover:text-zinc-700 dark:hover:text-zinc-200">
              Drift{sortIndicator("drift")}
            </Link>
            <span className="w-24">Status</span>
            <span className="flex-1">Signal heatmap</span>
          </div>

          {pivotRows.length === 0 && (
            <p className="py-12 text-center text-sm text-zinc-500 dark:text-zinc-400">
              No teacher data found for the selected window.
            </p>
          )}

          {pivotRows.map((row) => (
            <div
              key={row.teacherMembershipId}
              className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800 sm:flex-row sm:items-center sm:gap-4"
            >
              {/* Teacher name + avatar */}
              <Link
                href={`/analysis/teachers/${row.teacherMembershipId}?window=${windowDays}`}
                className="flex w-56 items-center gap-3 font-medium text-zinc-900 hover:underline dark:text-zinc-100"
              >
                <Avatar name={row.teacherName} size="sm" />
                <span className="truncate">{row.teacherName}</span>
              </Link>

              {/* Department */}
              <span className="w-32 truncate text-sm text-zinc-600 dark:text-zinc-400">
                {row.departmentNames.join(", ") || "—"}
              </span>

              {/* Coverage */}
              <span className="w-20 text-right text-sm tabular-nums text-zinc-700 dark:text-zinc-300">
                {row.teacherCoverage}
              </span>

              {/* Drift score */}
              <span className="w-20 text-right text-sm font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                {row.normalizedIDS.toFixed(2)}
              </span>

              {/* Status pill */}
              <div className="w-24">
                <StatusPill variant={STATUS_VARIANT[row.status]} size="sm">
                  {STATUS_LABELS[row.status]}
                </StatusPill>
              </div>

              {/* Signal heatmap strip */}
              <div className="flex flex-1 flex-wrap items-center gap-1">
                {SIGNAL_KEYS.map((key) => {
                  const cell = row.signalData[key];
                  const mean = cell?.currentMean;
                  const bg = mean != null ? meanToBgColor(mean) : "bg-zinc-200 dark:bg-zinc-600";
                  const label = SIGNAL_LABEL_MAP[key] ?? key;
                  return (
                    <div
                      key={key}
                      className={`h-5 w-5 rounded-sm ${bg}`}
                      title={`${label}: ${mean != null ? mean.toFixed(2) : "N/A"}`}
                    />
                  );
                })}
              </div>

              {/* Drifting / improving chips */}
              <div className="flex flex-wrap gap-1">
                {SIGNAL_KEYS.map((key) => {
                  const cell = row.signalData[key];
                  if (!cell?.delta || Math.abs(cell.delta) < 0.3) return null;
                  const isDrift = cell.delta < 0;
                  const label = truncateLabel(SIGNAL_LABEL_MAP[key] ?? key);
                  return (
                    <span
                      key={key}
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        isDrift
                          ? "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300"
                          : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                      }`}
                    >
                      {isDrift ? "↓" : "↑"} {label}
                    </span>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Priority view ───────────────────────────────────────────────────── */}
      {mode === "priorities" && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                <th className="px-4 py-3">
                  <Link href={sortUrl("name")} className="hover:text-zinc-700 dark:hover:text-zinc-200">
                    Teacher{sortIndicator("name")}
                  </Link>
                </th>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3 text-right">
                  <Link href={sortUrl("coverage")} className="hover:text-zinc-700 dark:hover:text-zinc-200">
                    Coverage{sortIndicator("coverage")}
                  </Link>
                </th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">
                  <Link href={sortUrl("drift")} className="hover:text-zinc-700 dark:hover:text-zinc-200">
                    Drift Score{sortIndicator("drift")}
                  </Link>
                </th>
                <th className="px-4 py-3">Top Drivers</th>
                <th className="px-4 py-3 text-right">Last Observed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {riskRows.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-500 dark:text-zinc-400">
                    No teacher data found for the selected window.
                  </td>
                </tr>
              )}
              {riskRows.map((row) => (
                <tr
                  key={row.teacherMembershipId}
                  className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                >
                  <td className="whitespace-nowrap px-4 py-3">
                    <Link
                      href={`/analysis/teachers/${row.teacherMembershipId}?window=${windowDays}`}
                      className="flex items-center gap-3 font-medium text-zinc-900 hover:underline dark:text-zinc-100"
                    >
                      <Avatar name={row.teacherName} size="sm" />
                      {row.teacherName}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-zinc-600 dark:text-zinc-400">
                    {row.departmentNames.join(", ") || "—"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-zinc-700 dark:text-zinc-300">
                    {row.teacherCoverage}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <StatusPill variant={STATUS_VARIANT[row.status]} size="sm">
                      {STATUS_LABELS[row.status]}
                    </StatusPill>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                    {row.normalizedIDS.toFixed(2)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {row.topDrivers.length === 0 && (
                        <span className="text-zinc-400 dark:text-zinc-500">—</span>
                      )}
                      {row.topDrivers.map((d) => {
                        const label = truncateLabel(SIGNAL_LABEL_MAP[d.signalKey] ?? d.signalKey);
                        const isDrift = d.delta < 0;
                        return (
                          <span
                            key={d.signalKey}
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                              isDrift
                                ? "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300"
                                : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                            }`}
                          >
                            {isDrift ? "↓" : "↑"} {label}
                          </span>
                        );
                      })}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-zinc-500 dark:text-zinc-400">
                    {row.lastObservationAt
                      ? new Date(row.lastObservationAt).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                        })
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
