import Link from "next/link";
import { getSessionUserOrThrow } from "@/lib/auth";
import { requireFeature } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusPill, PillVariant } from "@/components/ui/status-pill";
import { Avatar } from "@/components/ui/avatar";
import { scoreToBand, RiskBand } from "@/modules/analysis/studentRisk";
import { StudentsFilterBar } from "./StudentsFilterBar";

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
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-[28px] font-bold leading-tight tracking-[-0.03em] text-text">
            Student Management
          </h1>
          <p className="mt-1 text-[0.875rem] text-muted">
            {students.length} student{students.length === 1 ? "" : "s"}{hasFilters ? " (filtered)" : ""}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Link href="/students/import">
            <Button variant="secondary">Import snapshots</Button>
          </Link>
          <Link href="/students/import-subject-teachers">
            <Button variant="secondary">Import subject teachers</Button>
          </Link>
        </div>
      </div>

      {/* Filter bar */}
      <div className="rounded-2xl border border-border/30 bg-surface-container-lowest p-4 shadow-sm">
        <StudentsFilterBar
          yearGroups={yearGroups}
          currentQ={q}
          currentYearGroup={yearGroup}
          currentSend={send}
          currentPp={pp}
          currentBand={band}
        />
      </div>

      {/* Table */}
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
        <div className="table-shell overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="table-head-row">
                <th className="px-5 py-3 text-left font-semibold">Student</th>
                <th className="px-4 py-3 text-center font-semibold">Year</th>
                <th className="px-4 py-3 text-center font-semibold">Flags</th>
                {hasBehaviourData && <th className="px-4 py-3 text-center font-semibold">Band</th>}
                <th className="px-4 py-3 text-center font-semibold">Attendance</th>
                <th className="px-4 py-3 text-center font-semibold">Last snapshot</th>
                <th className="px-4 py-3 text-right font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => {
                const latest = s.snapshots[0];
                return (
                  <tr key={s.id} className="table-row calm-transition">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar name={s.fullName} size="sm" />
                        <Link
                          href={`/students/${s.id}`}
                          className="font-semibold text-text hover:text-accent calm-transition"
                        >
                          {s.fullName}
                        </Link>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center text-text">{s.yearGroup || "—"}</td>
                    <td className="px-4 py-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {s.sendFlag && <StatusPill variant="info" size="sm">SEND</StatusPill>}
                        {s.ppFlag && <StatusPill variant="accent" size="sm">PP</StatusPill>}
                        {!s.sendFlag && !s.ppFlag && <span className="text-muted">—</span>}
                      </div>
                    </td>
                    {hasBehaviourData && (
                      <td className="px-4 py-4 text-center">
                        {s.computedBand ? (
                          <StatusPill variant={BAND_VARIANT[s.computedBand]} size="sm">
                            {BAND_LABELS[s.computedBand]}
                          </StatusPill>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                    )}
                    <td className="px-4 py-4 text-center text-text">
                      {latest ? `${Number(latest.attendancePct).toFixed(1)}%` : "—"}
                    </td>
                    <td className="px-4 py-4 text-center text-muted">
                      {latest
                        ? new Date(latest.snapshotDate).toLocaleDateString(undefined, { day: "numeric", month: "short" })
                        : "—"}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <Link
                        href={`/students/${s.id}`}
                        className="calm-transition text-xs font-semibold text-accent hover:text-accentHover"
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
      )}
    </div>
  );
}
