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

      {/* Page header */}
      <PageHeader
        title="Teachers"
        subtitle="Teacher-level performance, drift analysis and signal breakdowns."
      />

      {/* ── Controls bar ────────────────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-2xl border border-white/60 bg-white/60 backdrop-blur-sm">
        <div className="border-b border-border/30 px-5 py-3">
          <p className="text-[0.75rem] font-semibold uppercase tracking-[0.08em] text-muted">Filters</p>
        </div>
        <div className="flex flex-wrap items-center gap-4 p-4">
          {/* Window selector */}
          <div className="flex items-center gap-1 rounded-lg border border-border bg-surface p-1">
            {VALID_WINDOWS.map((w) => (
              <Link
                key={w}
                href={buildUrl({ windowDays: String(w) })}
                className={`rounded-md px-3 py-1 text-sm font-medium calm-transition ${
                  w === windowDays
                    ? "bg-accent text-white"
                    : "text-muted hover:bg-bg hover:text-text"
                }`}
              >
                {w}d
              </Link>
            ))}
          </div>

          {/* Mode toggle */}
          <div className="flex items-center gap-1 rounded-lg border border-border bg-surface p-1">
            <Link
              href={buildUrl({ mode: "pivot" })}
              className={`rounded-md px-3 py-1 text-sm font-medium calm-transition ${
                mode === "pivot"
                  ? "bg-accent text-white"
                  : "text-muted hover:bg-bg hover:text-text"
              }`}
            >
              Performance view
            </Link>
            <Link
              href={buildUrl({ mode: "priorities" })}
              className={`rounded-md px-3 py-1 text-sm font-medium calm-transition ${
                mode === "priorities"
                  ? "bg-accent text-white"
                  : "text-muted hover:bg-bg hover:text-text"
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
              className="field min-w-[160px]"
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
              className="rounded-lg bg-accent px-4 py-2 text-[0.8125rem] font-semibold text-white calm-transition hover:bg-accentHover"
            >
              Apply
            </button>
            {departmentId && (
              <Link
                href={buildUrl({ departmentId: "" })}
                className="rounded-lg border border-border bg-white/70 px-4 py-2 text-[0.8125rem] font-medium text-muted calm-transition hover:text-text"
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
                className="rounded-lg border border-border bg-white/70 px-4 py-2 text-[0.8125rem] font-medium text-muted calm-transition hover:text-text"
              >
                Export CSV
              </button>
            </form>
          )}
        </div>
      </div>

      {/* ── Performance view (pivot) ────────────────────────────────────────── */}
      {mode === "pivot" && (
        <div className="space-y-3">
          {/* Column header row */}
          <div className="hidden items-center gap-4 border-b border-border px-4 pb-2 text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-muted sm:flex">
            <Link href={sortUrl("name")} className="w-56 calm-transition hover:text-text">
              Teacher{sortIndicator("name")}
            </Link>
            <span className="w-32">Department</span>
            <Link href={sortUrl("coverage")} className="w-20 text-right calm-transition hover:text-text">
              Coverage{sortIndicator("coverage")}
            </Link>
            <Link href={sortUrl("drift")} className="w-20 text-right calm-transition hover:text-text">
              Drift{sortIndicator("drift")}
            </Link>
            <span className="w-24">Status</span>
            <span className="flex-1">Signal heatmap</span>
          </div>

          {pivotRows.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-accent/10">
                <svg className="h-6 w-6 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
                </svg>
              </div>
              <p className="text-[0.875rem] font-semibold text-text">No teachers found</p>
              <p className="mt-1 text-[0.8125rem] text-muted">Try adjusting the window or department filter.</p>
            </div>
          )}

          {pivotRows.map((row) => (
            <div
              key={row.teacherMembershipId}
              className="flex flex-col gap-3 rounded-2xl border border-white/60 bg-white/60 p-4 backdrop-blur-sm calm-transition hover:bg-white/80 sm:flex-row sm:items-center sm:gap-4"
            >
              {/* Teacher name + avatar */}
              <Link
                href={`/analysis/teachers/${row.teacherMembershipId}?window=${windowDays}`}
                className="flex w-56 items-center gap-3 font-medium text-text hover:underline"
              >
                <Avatar name={row.teacherName} size="sm" />
                <span className="truncate">{row.teacherName}</span>
              </Link>

              {/* Department */}
              <span className="w-32 truncate text-sm text-muted">
                {row.departmentNames.join(", ") || "—"}
              </span>

              {/* Coverage */}
              <span className="w-20 text-right text-sm tabular-nums text-muted">
                {row.teacherCoverage}
              </span>

              {/* Drift score */}
              <span className="w-20 text-right text-sm font-semibold tabular-nums text-text">
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
                  const bg = mean != null ? meanToBgColor(mean) : "bg-border";
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
                          ? "bg-rose-100 text-rose-700"
                          : "bg-emerald-100 text-emerald-700"
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
        <>
          {riskRows.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-accent/10">
                <svg className="h-6 w-6 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
                </svg>
              </div>
              <p className="text-[0.875rem] font-semibold text-text">No teachers found</p>
              <p className="mt-1 text-[0.8125rem] text-muted">Try adjusting the window or department filter.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-white/60 bg-white/60 backdrop-blur-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border/30 bg-white/40 text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-muted">
                      <th className="px-5 py-3">
                        <Link href={sortUrl("name")} className="calm-transition hover:text-text">
                          Teacher{sortIndicator("name")}
                        </Link>
                      </th>
                      <th className="px-4 py-3">Department</th>
                      <th className="px-4 py-3 text-right">
                        <Link href={sortUrl("coverage")} className="calm-transition hover:text-text">
                          Coverage{sortIndicator("coverage")}
                        </Link>
                      </th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">
                        <Link href={sortUrl("drift")} className="calm-transition hover:text-text">
                          Drift Score{sortIndicator("drift")}
                        </Link>
                      </th>
                      <th className="px-4 py-3">Top Drivers</th>
                      <th className="px-4 py-3 text-right">Last Observed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {riskRows.map((row) => (
                      <tr
                        key={row.teacherMembershipId}
                        className="group border-b border-border/20 last:border-0 calm-transition hover:bg-white/50"
                      >
                        <td className="whitespace-nowrap px-5 py-3">
                          <Link
                            href={`/analysis/teachers/${row.teacherMembershipId}?window=${windowDays}`}
                            className="flex items-center gap-3 font-medium text-text calm-transition group-hover:text-accent hover:underline"
                          >
                            <Avatar name={row.teacherName} size="sm" />
                            {row.teacherName}
                          </Link>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-muted">
                          {row.departmentNames.join(", ") || "—"}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-muted">
                          {row.teacherCoverage}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <StatusPill variant={STATUS_VARIANT[row.status]} size="sm">
                            {STATUS_LABELS[row.status]}
                          </StatusPill>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums text-text">
                          {row.normalizedIDS.toFixed(2)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {row.topDrivers.length === 0 && (
                              <span className="text-muted">—</span>
                            )}
                            {row.topDrivers.map((d) => {
                              const label = truncateLabel(SIGNAL_LABEL_MAP[d.signalKey] ?? d.signalKey);
                              const isDrift = d.delta < 0;
                              return (
                                <span
                                  key={d.signalKey}
                                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                                    isDrift
                                      ? "bg-rose-100 text-rose-700"
                                      : "bg-emerald-100 text-emerald-700"
                                  }`}
                                >
                                  {isDrift ? "↓" : "↑"} {label}
                                </span>
                              );
                            })}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right text-muted">
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
            </div>
          )}
        </>
      )}

      {/* ── Footer ──────────────────────────────────────────────── */}
      <p className="mt-8 text-[0.75rem] text-muted">
        Explorer · Teachers · {windowDays}d window
      </p>
    </>
  );
}
