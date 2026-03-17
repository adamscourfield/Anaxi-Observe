import Link from "next/link";
import { getSessionUserOrThrow } from "@/lib/auth";
import { requireFeature } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusPill, PillVariant } from "@/components/ui/status-pill";
import { Avatar } from "@/components/ui/avatar";
import { scoreToBand, RiskBand } from "@/modules/analysis/studentRisk";

const BAND_LABELS: Record<RiskBand, string> = {
  STABLE: "Stable",
  WATCH: "Watch",
  PRIORITY: "Priority",
  URGENT: "Urgent",
};

const BAND_VARIANT: Record<RiskBand, PillVariant> = {
  STABLE: "success",
  WATCH: "neutral",
  PRIORITY: "warning",
  URGENT: "error",
};

interface SnapshotRow {
  snapshotDate: Date | string;
  attendancePct: number | string;
  detentionsCount: number;
  onCallsCount: number;
  latenessCount: number;
  internalExclusionsCount: number;
  suspensionsCount: number;
}

interface StudentRow {
  id: string;
  fullName: string;
  yearGroup: string | null;
  sendFlag: boolean;
  ppFlag: boolean;
  snapshots: SnapshotRow[];
}

function simpleRiskScore(s: SnapshotRow): number {
  let score = 0;
  const att = Number(s.attendancePct);
  if (att < 90) score += 2;
  else if (att < 95) score += 1;
  if (s.detentionsCount >= 3) score += 2;
  else if (s.detentionsCount >= 1) score += 1;
  if (s.onCallsCount >= 2) score += 2;
  else if (s.onCallsCount >= 1) score += 1;
  if (s.suspensionsCount >= 1) score += 2;
  if (s.internalExclusionsCount >= 1) score += 1;
  if (s.latenessCount >= 5) score += 1;
  return score;
}

export default async function StudentsPage({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  const user = await getSessionUserOrThrow();
  await requireFeature(user.tenantId, "STUDENTS");

  const q = searchParams.q || "";
  const yearGroup = searchParams.yearGroup || "";
  const send = searchParams.send || "";
  const pp = searchParams.pp || "";
  const band = searchParams.band || "";

  const where: Record<string, unknown> = {
    tenantId: user.tenantId,
    status: "ACTIVE",
    ...(q ? { OR: [{ fullName: { contains: q, mode: "insensitive" } }, { upn: { contains: q, mode: "insensitive" } }] } : {}),
    ...(yearGroup ? { yearGroup } : {}),
    ...(send ? { sendFlag: send === "true" } : {}),
    ...(pp ? { ppFlag: pp === "true" } : {}),
  };

  const [rawStudents, distinctYearGroups] = await Promise.all([
    (prisma as any).student.findMany({
      where,
      orderBy: { fullName: "asc" },
      take: 100,
      include: {
        snapshots: { orderBy: { snapshotDate: "desc" }, take: 1 },
      },
    }),
    (prisma as any).student.findMany({
      where: { tenantId: user.tenantId, status: "ACTIVE" },
      distinct: ["yearGroup"],
      select: { yearGroup: true },
      orderBy: { yearGroup: "asc" },
    }),
  ]);

  const allStudents = rawStudents as StudentRow[];

  const yearGroups: string[] = (distinctYearGroups as { yearGroup: string | null }[])
    .map((r) => r.yearGroup)
    .filter((v): v is string => Boolean(v));

  const studentsWithBand = allStudents.map((s) => {
    const latest = s.snapshots[0];
    const computedBand = latest ? scoreToBand(simpleRiskScore(latest)) : null;
    return { ...s, computedBand };
  });

  const students = band
    ? studentsWithBand.filter((s) => s.computedBand === band)
    : studentsWithBand;

  const hasFilters = !!(q || yearGroup || send || pp || band);
  const hasBehaviourData = students.some((s) => s.snapshots.length > 0);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Students"
        subtitle={`${students.length} student${students.length === 1 ? "" : "s"} shown${hasFilters ? " (filtered)" : ""}`}
        actions={
          <div className="flex items-center gap-2">
            <Link href="/students/import">
              <Button variant="secondary">Import snapshots</Button>
            </Link>
            <Link href="/students/import-subject-teachers">
              <Button variant="secondary">Import subject teachers</Button>
            </Link>
          </div>
        }
      />

      <Card className="p-4">
        <form className="flex flex-wrap items-center gap-2" method="get">
          <input
            name="q"
            defaultValue={q}
            placeholder="Search by name or UPN…"
            className="min-w-[180px] flex-1 rounded-lg border border-border bg-white px-3 py-2 text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
          <select
            name="yearGroup"
            defaultValue={yearGroup}
            className="rounded-lg border border-border bg-white px-3 py-2 text-sm text-text"
          >
            <option value="">All years</option>
            {yearGroups.map((yg) => (
              <option key={yg} value={yg}>{yg}</option>
            ))}
          </select>
          <select
            name="send"
            defaultValue={send}
            className="rounded-lg border border-border bg-white px-3 py-2 text-sm text-text"
          >
            <option value="">SEND</option>
            <option value="true">SEND Yes</option>
            <option value="false">SEND No</option>
          </select>
          <select
            name="pp"
            defaultValue={pp}
            className="rounded-lg border border-border bg-white px-3 py-2 text-sm text-text"
          >
            <option value="">PP</option>
            <option value="true">PP Yes</option>
            <option value="false">PP No</option>
          </select>
          <select
            name="band"
            defaultValue={band}
            className="rounded-lg border border-border bg-white px-3 py-2 text-sm text-text"
          >
            <option value="">Band</option>
            <option value="STABLE">Stable</option>
            <option value="WATCH">Watch</option>
            <option value="PRIORITY">Priority</option>
            <option value="URGENT">Urgent</option>
          </select>
          <Button type="submit">Apply</Button>
          {hasFilters && (
            <Link href="/students">
              <Button type="button" variant="ghost">Clear</Button>
            </Link>
          )}
        </form>
      </Card>

      {students.length === 0 ? (
        <EmptyState
          title="No students found"
          description={hasFilters ? "Try broadening your filters or clearing them." : "No active students in the system yet. Import a snapshot to get started."}
          action={
            hasFilters ? (
              <Link href="/students">
                <Button variant="secondary">Clear filters</Button>
              </Link>
            ) : (
              <Link href="/students/import">
                <Button variant="secondary">Import snapshots</Button>
              </Link>
            )
          }
        />
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-border/80 text-left text-xs uppercase tracking-wide text-muted">
                  <th className="sticky left-0 z-10 bg-white px-4 py-3 font-medium">Student</th>
                  <th className="px-4 py-3 font-medium text-center">Year</th>
                  {hasBehaviourData && <th className="px-4 py-3 font-medium text-center">Band</th>}
                  <th className="px-4 py-3 font-medium text-center">Attendance</th>
                  <th className="px-4 py-3 font-medium text-center">Last snapshot</th>
                  <th className="px-4 py-3 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => {
                  const latest = s.snapshots[0];
                  return (
                    <tr key={s.id} className="border-b border-border/50 last:border-0 hover:bg-[#f8fafc] calm-transition">
                      <td className="sticky left-0 z-10 bg-white px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar name={s.fullName} size="sm" />
                          <div className="min-w-0">
                            <Link
                              href={`/students/${s.id}`}
                              className="font-medium text-text hover:text-accent calm-transition"
                            >
                              {s.fullName}
                            </Link>
                            {(s.sendFlag || s.ppFlag) && (
                              <div className="mt-0.5 flex gap-1">
                                {s.sendFlag && <StatusPill variant="info" size="sm">SEND</StatusPill>}
                                {s.ppFlag && <StatusPill variant="accent" size="sm">PP</StatusPill>}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center text-text">{s.yearGroup || "—"}</td>
                      {hasBehaviourData && (
                        <td className="px-4 py-3 text-center">
                          {s.computedBand ? (
                            <StatusPill variant={BAND_VARIANT[s.computedBand]} size="sm">
                              {BAND_LABELS[s.computedBand]}
                            </StatusPill>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                      )}
                      <td className="px-4 py-3 text-center text-text">
                        {latest ? `${Number(latest.attendancePct).toFixed(1)}%` : "—"}
                      </td>
                      <td className="px-4 py-3 text-center text-muted">
                        {latest
                          ? new Date(latest.snapshotDate).toLocaleDateString(undefined, { day: "numeric", month: "short" })
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/students/${s.id}`}
                          className="text-xs font-medium text-accent hover:text-accentHover calm-transition"
                        >
                          View →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
