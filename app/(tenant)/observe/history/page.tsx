import Link from "next/link";
import { getSessionUserOrThrow } from "@/lib/auth";
import { requireFeature } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusPill } from "@/components/ui/status-pill";

import { formatPhaseLabel, phaseVariant } from "@/modules/observations/phaseLabel";

export default async function ObservationHistoryPage({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) {
  const user = await getSessionUserOrThrow();
  await requireFeature(user.tenantId, "OBSERVATIONS");

  const teacherId = String(searchParams?.teacherId || "");
  const subject = String(searchParams?.subject || "").trim();
  const yearGroup = String(searchParams?.yearGroup || "").trim();
  const observerId = String(searchParams?.observerId || "");
  const from = String(searchParams?.from || "");
  const to = String(searchParams?.to || "");
  const windowDays = Number(searchParams?.window || "");
  const useWindow = Number.isFinite(windowDays) && windowDays > 0 && !from && !to;
  const windowStart = useWindow ? new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000) : null;

  const [teachers, observers, hodMemberships, coachAssignments] = await Promise.all([
    (prisma as any).user.findMany({ where: { tenantId: user.tenantId, isActive: true }, orderBy: { fullName: "asc" } }),
    (prisma as any).user.findMany({ where: { tenantId: user.tenantId, isActive: true, role: { in: ["LEADER", "SLT", "ADMIN"] } }, orderBy: { fullName: "asc" } }),
    (prisma as any).departmentMembership.findMany({ where: { userId: user.id, isHeadOfDepartment: true } }),
    (prisma as any).coachAssignment.findMany({ where: { coachUserId: user.id } }),
  ]);

  const hodDepartmentIds = (hodMemberships as any[]).map((m: any) => m.departmentId);
  const coacheeUserIds = (coachAssignments as any[]).map((a: any) => a.coacheeUserId);

  const hodDeptMemberships = hodDepartmentIds.length > 0
    ? await (prisma as any).departmentMembership.findMany({
        where: { tenantId: user.tenantId, departmentId: { in: hodDepartmentIds } },
        select: { userId: true, departmentId: true },
      })
    : [];

  const hodVisibleUserIds = new Set((hodDeptMemberships as any[]).map((m: any) => m.userId));
  const coachVisibleUserIds = new Set(coacheeUserIds);

  const where: any = {
    tenantId: user.tenantId,
    ...(subject ? { subject } : {}),
    ...(yearGroup ? { yearGroup } : {}),
    ...(observerId ? { observerId } : {}),
    ...((from || to || useWindow)
      ? {
          observedAt: {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to ? { lte: new Date(to) } : {}),
            ...(useWindow && windowStart ? { gte: windowStart } : {}),
          }
        }
      : {})
  };

  let allowedTeacherIds: Set<string> | null = null;

  if (user.role === "TEACHER") {
    where.observedTeacherId = user.id;
    allowedTeacherIds = new Set([user.id]);
  } else if (user.role === "ADMIN" || user.role === "SLT") {
    if (teacherId) where.observedTeacherId = teacherId;
  } else {
    allowedTeacherIds = new Set<string>([
      ...Array.from(hodVisibleUserIds),
      ...Array.from(coachVisibleUserIds),
    ]);
    if (teacherId) {
      where.observedTeacherId = allowedTeacherIds.has(teacherId) ? teacherId : "__NO_MATCH__";
    } else {
      where.observedTeacherId = { in: Array.from(allowedTeacherIds) };
    }
  }

  const visibleTeachers = allowedTeacherIds
    ? (teachers as any[]).filter((t: any) => allowedTeacherIds!.has(t.id))
    : (teachers as any[]);

  const scopedFilterWhere: any = { tenantId: user.tenantId };
  if (user.role === "TEACHER") {
    scopedFilterWhere.observedTeacherId = user.id;
  } else if (allowedTeacherIds) {
    scopedFilterWhere.observedTeacherId = { in: Array.from(allowedTeacherIds) };
  }

  const [observations, distinctSubjects, distinctYearGroups] = await Promise.all([
    (prisma as any).observation.findMany({
      where,
      include: { observedTeacher: true, observer: true, signals: true },
      orderBy: { observedAt: "desc" },
      take: 100,
    }),
    (prisma as any).observation.findMany({ where: scopedFilterWhere, distinct: ["subject"], select: { subject: true }, orderBy: { subject: "asc" } }),
    (prisma as any).observation.findMany({ where: scopedFilterWhere, distinct: ["yearGroup"], select: { yearGroup: true }, orderBy: { yearGroup: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Observation history"
        subtitle="Recent classroom observations filtered by teacher, observer, subject, year group, or date."
        actions={
          user.role !== "TEACHER" ? (
            <Link href="/observe/new">
              <Button>New observation</Button>
            </Link>
          ) : undefined
        }
      />

      {/* Filters */}
      <div className="table-shell">
        <div className="table-header-strip">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-muted">Filters</p>
        </div>
        <form className="flex flex-wrap items-end gap-3 p-4">
          {user.role !== "TEACHER" ? (
            <>
              <select name="teacherId" defaultValue={teacherId} className="rounded-lg border border-border bg-white px-3 py-2 text-sm text-text">
                <option value="">All teachers</option>
                {visibleTeachers.map((teacher: any) => <option key={teacher.id} value={teacher.id}>{teacher.fullName}</option>)}
              </select>
              <select name="observerId" defaultValue={observerId} className="rounded-lg border border-border bg-white px-3 py-2 text-sm text-text">
                <option value="">All observers</option>
                {(observers as any[]).map((observer) => <option key={observer.id} value={observer.id}>{observer.fullName}</option>)}
              </select>
            </>
          ) : null}
          <select name="subject" defaultValue={subject} className="rounded-lg border border-border bg-white px-3 py-2 text-sm text-text">
            <option value="">All subjects</option>
            {(distinctSubjects as { subject: string }[]).map((row) => <option key={row.subject} value={row.subject}>{row.subject}</option>)}
          </select>
          <select name="yearGroup" defaultValue={yearGroup} className="rounded-lg border border-border bg-white px-3 py-2 text-sm text-text">
            <option value="">All year groups</option>
            {(distinctYearGroups as { yearGroup: string }[]).map((row) => <option key={row.yearGroup} value={row.yearGroup}>Year {row.yearGroup}</option>)}
          </select>
          <input name="from" type="date" defaultValue={from} className="rounded-lg border border-border bg-white px-3 py-2 text-sm text-text" />
          <input name="to" type="date" defaultValue={to} className="rounded-lg border border-border bg-white px-3 py-2 text-sm text-text" />
          <Button type="submit" variant="secondary" className="px-4 py-2 text-sm">Apply</Button>
          <Link href="/observe/history" className="calm-transition rounded-lg border border-border bg-white px-4 py-2 text-sm text-muted hover:text-text">
            Reset
          </Link>
        </form>
      </div>

      {/* Observations table */}
      <div className="table-shell">
        <div className="table-header-strip">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-muted">
            {(observations as any[]).length} observation{(observations as any[]).length !== 1 ? "s" : ""}
          </p>
        </div>

        {(observations as any[]).length === 0 ? (
          <div className="p-8">
            <EmptyState title="No observations found" description="Try widening your filters or selecting a different date range." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="table-head-row">
                  <th className="px-4 py-3 text-left font-semibold">Date</th>
                  <th className="px-4 py-3 text-left font-semibold">Teacher</th>
                  {user.role !== "TEACHER" && <th className="px-4 py-3 text-left font-semibold">Observer</th>}
                  <th className="px-4 py-3 text-left font-semibold">Subject</th>
                  <th className="px-4 py-3 text-left font-semibold">Year</th>
                  <th className="px-4 py-3 text-left font-semibold">Phase</th>
                  <th className="px-4 py-3 text-left font-semibold">Signals</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {(observations as any[]).map((obs) => {
                  const phase = obs.phase as string;
                  const signalCount = (obs.signals as any[]).filter((s: any) => s.valueKey).length;
                  const totalSignals = (obs.signals as any[]).length;
                  return (
                    <tr key={obs.id} className="table-row">
                      <td className="px-4 py-3 text-text">
                        {new Date(obs.observedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                      </td>
                      <td className="px-4 py-3 font-medium text-text">{obs.observedTeacher?.fullName ?? "—"}</td>
                      {user.role !== "TEACHER" && (
                        <td className="px-4 py-3 text-muted">{obs.observer?.fullName ?? "—"}</td>
                      )}
                      <td className="px-4 py-3 text-text">{obs.subject}</td>
                      <td className="px-4 py-3 text-muted">Yr {obs.yearGroup}</td>
                      <td className="px-4 py-3">
                        <StatusPill variant={phaseVariant(phase)} size="sm">
                          {formatPhaseLabel(phase)}
                        </StatusPill>
                      </td>
                      <td className="px-4 py-3 tabular-nums text-muted">
                        {signalCount}/{totalSignals}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/observe/${obs.id}`}
                          className="calm-transition inline-flex items-center rounded-lg border border-border bg-white px-3 py-1 text-xs font-medium text-text shadow-sm hover:border-accent/30 hover:text-accent"
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
    </div>
  );
}
