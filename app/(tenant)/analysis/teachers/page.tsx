import Link from "next/link";
import { getSessionUserOrThrow } from "@/lib/auth";
import { requireFeature } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { H1, MetaText, BodyText } from "@/components/ui/typography";
import { computeTeacherRiskIndex, RiskStatus } from "@/modules/analysis/teacherRisk";
import { canViewTeacherAnalysis } from "@/modules/authz";

const WINDOW_OPTIONS = [7, 21, 28] as const;

const STATUS_LABELS: Record<RiskStatus, string> = {
  SIGNIFICANT_DRIFT: "Significant drift",
  EMERGING_DRIFT: "Emerging drift",
  STABLE: "Stable",
  LOW_COVERAGE: "Low coverage",
};

const STATUS_PILL: Record<RiskStatus, string> = {
  SIGNIFICANT_DRIFT: "bg-red-100 text-red-700",
  EMERGING_DRIFT: "bg-amber-100 text-amber-700",
  STABLE: "bg-green-100 text-green-700",
  LOW_COVERAGE: "bg-slate-100 text-slate-500",
};

export default async function TeacherAnalysisPage({
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

  // Build viewer context for RBAC
  const [hodMemberships, coachAssignments] = await Promise.all([
    (prisma as any).departmentMembership.findMany({
      where: { userId: user.id, isHeadOfDepartment: true },
    }),
    (prisma as any).coachAssignment.findMany({ where: { coachUserId: user.id } }),
  ]);

  const hodDepartmentIds = (hodMemberships as any[]).map((m: any) => m.departmentId);
  const coacheeUserIds = (coachAssignments as any[]).map((a: any) => a.coacheeUserId);

  const viewerContext = { userId: user.id, role: user.role, hodDepartmentIds, coacheeUserIds };

  // Compute risk index
  const allRows = await computeTeacherRiskIndex(user.tenantId, windowDays);

  // Load department memberships for RBAC filtering
  const deptMemberships = await (prisma as any).departmentMembership.findMany({
    where: { tenantId: user.tenantId },
  });
  const teacherDepts = new Map<string, string[]>();
  for (const m of deptMemberships as any[]) {
    if (!teacherDepts.has(m.userId)) teacherDepts.set(m.userId, []);
    teacherDepts.get(m.userId)!.push(m.departmentId);
  }

  // Filter rows by visibility
  const rows = allRows.filter((row) =>
    canViewTeacherAnalysis(viewerContext, {
      teacherUserId: row.teacherMembershipId,
      teacherDepartmentIds: teacherDepts.get(row.teacherMembershipId) ?? [],
    })
  );

  // Get settings for metadata
  const settings = await (prisma as any).tenantSettings.findUnique({ where: { tenantId: user.tenantId } });
  const computedAt = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <H1>Teacher support priorities</H1>
        <MetaText>
          Window: Last {windowDays} days · Based on observations · Updated {computedAt}
        </MetaText>
      </div>

      {/* Window selector */}
      <div className="flex items-center gap-2">
        <MetaText className="mr-1">Window:</MetaText>
        {WINDOW_OPTIONS.map((w) => (
          <Link
            key={w}
            href={`/analysis/teachers?window=${w}`}
            className={`calm-transition rounded-lg border px-4 py-2 text-sm font-medium transition duration-200 ease-calm ${
              w === windowDays
                ? "border-accent bg-[var(--accent-tint)] text-text"
                : "border-border bg-surface text-text hover:border-accentHover"
            }`}
          >
            {w} days
          </Link>
        ))}
      </div>

      {/* Table */}
      <Card className="overflow-hidden p-0">
        {rows.length === 0 ? (
          <div className="p-6">
            <BodyText className="text-muted">
              No observation data available for the selected window.
            </BodyText>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-bg text-left text-xs font-medium text-muted">
                <th className="px-4 py-3">Teacher</th>
                <th className="px-4 py-3">Department(s)</th>
                <th className="px-4 py-3">Coverage</th>
                <th className="px-4 py-3">Drift status</th>
                <th className="px-4 py-3">Drift score</th>
                <th className="px-4 py-3">Last observed</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr
                  key={row.teacherMembershipId}
                  className={`border-b border-divider last:border-0 hover:bg-bg ${i % 2 === 0 ? "" : ""}`}
                >
                  <td className="px-4 py-3 font-medium text-text">
                    <Link
                      href={`/analysis/teachers/${row.teacherMembershipId}?window=${windowDays}`}
                      className="hover:underline"
                    >
                      {row.teacherName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {row.departmentNames.length > 0 ? row.departmentNames.join(", ") : "—"}
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {row.teacherCoverage} observation{row.teacherCoverage !== 1 ? "s" : ""}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_PILL[row.status]}`}>
                      {STATUS_LABELS[row.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {row.status === "LOW_COVERAGE" ? "—" : row.normalizedIDS.toFixed(1)}
                  </td>
                  <td className="px-4 py-3 text-muted">
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
        )}
      </Card>

      {/* Footer meta */}
      <MetaText>
        Min. coverage threshold: {settings?.minObservationCount ?? 6} observations · Drift threshold: {settings?.driftDeltaThreshold ?? 0.35}
      </MetaText>
    </div>
  );
}
