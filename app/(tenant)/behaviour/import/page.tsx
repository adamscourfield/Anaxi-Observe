import { getSessionUserOrThrow } from "@/lib/auth";
import { requireFeature } from "@/lib/guards";
import { hasPermission } from "@/lib/rbac";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SnapshotUploader } from "@/components/import/SnapshotUploader";
import { SnapshotImportHistory } from "@/components/import/SnapshotImportHistory";
import { H1, BodyText } from "@/components/ui/typography";
import { Card } from "@/components/ui/card";

export default async function BehaviourImportPage() {
  const user = await getSessionUserOrThrow();
  await requireFeature(user.tenantId, "STUDENTS_IMPORT");
  if (!hasPermission(user.role, "import:write")) redirect("/tenant");

  /* ── Fetch stats from the database ────────────────────────────── */
  const [totalRecords, jobs, totalJobs, prevTotalRecords] = await Promise.all([
    // Total student snapshot rows synced for this tenant
    (prisma as any).studentSnapshot.count({
      where: { tenantId: user.tenantId },
    }) as Promise<number>,
    // Recent import jobs for this tenant
    (prisma as any).importJob.findMany({
      where: { tenantId: user.tenantId },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    // Total import job count
    (prisma as any).importJob.count({
      where: { tenantId: user.tenantId },
    }) as Promise<number>,
    // Snapshot count from 30 days ago for growth calculation
    (prisma as any).studentSnapshot.count({
      where: {
        tenantId: user.tenantId,
        createdAt: { lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
    }) as Promise<number>,
  ]);

  // Calculate growth percentage
  const growthPct = prevTotalRecords > 0
    ? Math.round(((totalRecords - prevTotalRecords) / prevTotalRecords) * 100)
    : 0;

  // Calculate integrity score: percentage of successful import jobs
  const successfulJobs = (jobs as any[]).filter(
    (j: any) => j.status === "SUCCESS" || j.status === "COMPLETED",
  ).length;
  const integrityScore =
    totalJobs > 0
      ? ((successfulJobs / Math.min(totalJobs, 20)) * 100).toFixed(1)
      : "100.0";

  // Serialize jobs for the client component
  const serializedJobs = (jobs as any[]).map((j: any) => ({
    id: j.id,
    type: j.type,
    status: j.status,
    fileName: j.fileName,
    rowCount: j.rowCount ?? 0,
    rowsProcessed: j.rowsProcessed ?? 0,
    rowsFailed: j.rowsFailed ?? 0,
    errorSummary: j.errorSummary ?? null,
    createdAt: j.createdAt?.toISOString?.() ?? new Date().toISOString(),
  }));

  return (
    <div className="space-y-6">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div>
        <H1>Import Student Snapshot Data</H1>
        <BodyText className="mt-1 max-w-2xl text-muted">
          Bulk synchronize student behavior and assessment records using standardized CSV snapshots.
          Ensure all headers match the institutional ledger template.
        </BodyText>
      </div>

      {/* ── Upload Section ─────────────────────────────────────────── */}
      <SnapshotUploader />

      {/* ── Stat Cards ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Total Records Sync'd */}
        <Card className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
              Total Records Sync&apos;d
            </p>
            <div className="mt-1.5 flex items-baseline gap-2">
              <span className="text-[28px] font-bold leading-none tracking-[-0.02em] text-text tabular-nums">
                {totalRecords.toLocaleString()}
              </span>
              {growthPct !== 0 && (
                <span
                  className={`text-xs font-medium ${
                    growthPct > 0 ? "text-[var(--success)]" : "text-error"
                  }`}
                >
                  {growthPct > 0 ? "↗" : "↘"}{Math.abs(growthPct)}%
                </span>
              )}
            </div>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--surface-container)] text-[var(--on-surface-variant)]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
            </svg>
          </div>
        </Card>

        {/* Integrity Score */}
        <Card className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
              Integrity Score
            </p>
            <div className="mt-1.5 flex items-baseline gap-2">
              <span className="text-[28px] font-bold leading-none tracking-[-0.02em] text-text tabular-nums">
                {integrityScore}%
              </span>
              <span className="text-xs text-muted">Institutional Std</span>
            </div>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--surface-container)] text-[var(--on-surface-variant)]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <polyline points="9 12 11.25 14.25 15 9" />
            </svg>
          </div>
        </Card>
      </div>

      {/* ── Recent Import History ──────────────────────────────────── */}
      <SnapshotImportHistory jobs={serializedJobs} total={totalJobs} />
    </div>
  );
}
