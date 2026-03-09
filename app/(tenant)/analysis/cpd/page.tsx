import Link from "next/link";
import { getSessionUserOrThrow } from "@/lib/auth";
import { requireFeature } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { H1, H2, MetaText, BodyText } from "@/components/ui/typography";
import {
  computeCpdPriorities,
  getTopImprovingSignals,
} from "@/modules/analysis/cpdPriorities";

const WINDOW_OPTIONS = [7, 21, 28] as const;

export default async function CpdPrioritiesPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const user = await getSessionUserOrThrow();
  await requireFeature(user.tenantId, "ANALYSIS");

  const rawWindow = Number(searchParams?.window ?? "21");
  const windowDays = WINDOW_OPTIONS.includes(rawWindow as (typeof WINDOW_OPTIONS)[number])
    ? (rawWindow as (typeof WINDOW_OPTIONS)[number])
    : 21;

  const rawDept = typeof searchParams?.department === "string" ? searchParams.department : undefined;

  // If user is HOD, limit department options to their departments
  const hodMemberships = await (prisma as any).departmentMembership.findMany({
    where: { userId: user.id, isHeadOfDepartment: true },
    include: { department: true },
  });
  const hodDepartments: { id: string; name: string }[] = (hodMemberships as any[]).map(
    (m: any) => ({ id: m.departmentId, name: m.department.name })
  );

  // All departments (for non-HOD)
  const allDepartments = await (prisma as any).department.findMany({
    where: { tenantId: user.tenantId },
    orderBy: { name: "asc" },
  });

  const isHod = user.role === "HOD";
  const departmentOptions: { id: string; name: string }[] = isHod
    ? hodDepartments
    : (allDepartments as any[]).map((d: any) => ({ id: d.id, name: d.name }));

  // If HOD and no dept filter, default to first HOD dept
  let departmentId: string | undefined = rawDept;
  if (isHod && !departmentId && hodDepartments.length > 0) {
    departmentId = hodDepartments[0].id;
  }

  // If HOD and a dept is set, ensure it's within their depts
  if (isHod && departmentId) {
    const allowed = hodDepartments.map((d) => d.id);
    if (!allowed.includes(departmentId)) {
      departmentId = hodDepartments[0]?.id;
    }
  }

  const filters = departmentId ? { departmentId } : undefined;

  const [rows, settings] = await Promise.all([
    computeCpdPriorities(user.tenantId, windowDays, filters),
    (prisma as any).tenantSettings.findUnique({ where: { tenantId: user.tenantId } }),
  ]);

  const minCoverage: number = settings?.minObservationCount ?? 6;
  const computedAt = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const topImproving = getTopImprovingSignals(rows);

  const baseHref = (extra?: string) => {
    const params = new URLSearchParams();
    params.set("window", String(windowDays));
    if (departmentId) params.set("department", departmentId);
    if (extra) return `/analysis/cpd${extra}?${params.toString()}`;
    return `/analysis/cpd?${params.toString()}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <H1>CPD priorities</H1>
        <MetaText>
          Most commonly weakening signals · Window: last {windowDays} days · Updated{" "}
          {computedAt} · Coverage threshold: {minCoverage} obs
        </MetaText>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Window selector */}
        <div className="flex items-center gap-2">
          <MetaText className="mr-1">Window:</MetaText>
          {WINDOW_OPTIONS.map((w) => {
            const params = new URLSearchParams();
            params.set("window", String(w));
            if (departmentId) params.set("department", departmentId);
            return (
              <Link
                key={w}
                href={`/analysis/cpd?${params.toString()}`}
                className={`calm-transition rounded-lg border px-4 py-2 text-sm font-medium transition duration-200 ease-calm ${
                  w === windowDays
                    ? "border-accent bg-[var(--accent-tint)] text-text"
                    : "border-border bg-surface text-text hover:border-accentHover"
                }`}
              >
                {w} days
              </Link>
            );
          })}
        </div>

        {/* Department filter */}
        {departmentOptions.length > 0 && (
          <div className="flex items-center gap-2">
            <MetaText className="mr-1">Department:</MetaText>
            <div className="flex flex-wrap gap-2">
              {!isHod && (
                <Link
                  href={`/analysis/cpd?window=${windowDays}`}
                  className={`calm-transition rounded-lg border px-3 py-1.5 text-sm font-medium transition duration-200 ease-calm ${
                    !departmentId
                      ? "border-accent bg-[var(--accent-tint)] text-text"
                      : "border-border bg-surface text-text hover:border-accentHover"
                  }`}
                >
                  All
                </Link>
              )}
              {departmentOptions.map((dept) => {
                const params = new URLSearchParams();
                params.set("window", String(windowDays));
                params.set("department", dept.id);
                return (
                  <Link
                    key={dept.id}
                    href={`/analysis/cpd?${params.toString()}`}
                    className={`calm-transition rounded-lg border px-3 py-1.5 text-sm font-medium transition duration-200 ease-calm ${
                      departmentId === dept.id
                        ? "border-accent bg-[var(--accent-tint)] text-text"
                        : "border-border bg-surface text-text hover:border-accentHover"
                    }`}
                  >
                    {dept.name}
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Metric definitions */}
      <details className="rounded-lg border border-border bg-surface p-4">
        <summary className="cursor-pointer text-sm font-medium text-text">Metric definitions</summary>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted">
          <li><strong>Drift rate</strong>: Percentage of covered teachers showing weakening for a signal.</li>
          <li><strong>Avg negative delta</strong>: Mean size of decline where decline is present.</li>
          <li><strong>Teachers covered</strong>: Number of teachers with sufficient observations in window.</li>
          <li><strong>Improving rate</strong>: Percentage of covered teachers improving on that signal.</li>
        </ul>
      </details>

      {/* Main ranked table */}
      <Card className="overflow-hidden p-0">
        <div className="border-b border-border px-4 py-3">
          <H2>Areas for focus</H2>
          <MetaText>Signals showing the most widespread weakening in the selected window.</MetaText>
        </div>
        {rows.length === 0 ? (
          <div className="p-6">
            <BodyText className="text-muted">
              No observation data available for the selected window.
            </BodyText>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-bg text-left text-xs font-medium text-muted">
                <th className="px-4 py-3">Signal</th>
                <th className="px-4 py-3 text-right">Drift rate</th>
                <th className="px-4 py-3 text-right">Avg negative delta</th>
                <th className="px-4 py-3 text-right">Teachers covered</th>
                <th className="px-4 py-3 text-right">Improving rate</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const params = new URLSearchParams();
                params.set("window", String(windowDays));
                if (departmentId) params.set("department", departmentId);
                return (
                  <tr
                    key={row.signalKey}
                    className="border-b border-divider last:border-0 hover:bg-bg"
                  >
                    <td className="px-4 py-3 font-medium text-text">
                      <Link
                        href={`/analysis/cpd/${row.signalKey}?${params.toString()}`}
                        className="hover:underline"
                      >
                        {row.label}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted">
                      {row.teachersCovered === 0
                        ? "—"
                        : `${Math.round(row.driftRate * 100)}%`}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted">
                      {row.avgNegativeDelta !== null
                        ? row.avgNegativeDelta.toFixed(2)
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted">
                      {row.teachersCovered}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted">
                      {row.teachersCovered === 0
                        ? "—"
                        : `${Math.round(row.improvingRate * 100)}%`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        )}
      </Card>

      {/* Coverage note */}
      {rows.length > 0 && (
        <MetaText>
          Based on teachers with at least {minCoverage} observations in the selected window.
        </MetaText>
      )}

      {/* Positive momentum section */}
      {topImproving.length > 0 && (
        <div className="space-y-3">
          <div className="space-y-0.5">
            <H2>Positive momentum</H2>
            <MetaText>
              Signals showing the strongest improvement in the last {windowDays} days.
            </MetaText>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {topImproving.map((row) => {
              const params = new URLSearchParams();
              params.set("window", String(windowDays));
              if (departmentId) params.set("department", departmentId);
              return (
                <Link
                  key={row.signalKey}
                  href={`/analysis/cpd/${row.signalKey}?${params.toString()}`}
                  className="block rounded-lg border border-border bg-surface p-4 shadow-sm hover:border-accentHover calm-transition transition duration-200 ease-calm"
                >
                  <p className="text-sm font-medium text-text">{row.label}</p>
                  <div className="mt-2 space-y-0.5">
                    <MetaText>
                      {Math.round(row.improvingRate * 100)}% of teachers improving
                    </MetaText>
                    {row.avgPositiveDelta !== null && (
                      <MetaText>
                        Avg delta: +{row.avgPositiveDelta.toFixed(2)}
                      </MetaText>
                    )}
                    <MetaText>{row.teachersCovered} teachers covered</MetaText>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
