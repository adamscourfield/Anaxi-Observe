import Link from "next/link";
import { notFound } from "next/navigation";
import { getSessionUserOrThrow } from "@/lib/auth";
import { requireFeature } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { canViewExplorer, canExportExplorer } from "@/modules/authz";
import { PageHeader } from "@/components/ui/page-header";
import { Avatar } from "@/components/ui/avatar";
import { formatPhaseLabel, phaseVariant } from "@/modules/observations/phaseLabel";
import { StatusPill } from "@/components/ui/status-pill";

/* ─── Constants ────────────────────────────────────────────────────────────── */

const VALID_WINDOWS = [7, 21, 28] as const;
type WindowDays = (typeof VALID_WINDOWS)[number];

function isValidWindow(v: unknown): v is WindowDays {
  return VALID_WINDOWS.includes(Number(v) as WindowDays);
}

function formatShortDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/* ─── Page ─────────────────────────────────────────────────────────────────── */

export default async function ExplorerObservationsPage({
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

  const showExport = canExportExplorer(viewerContext);

  // ─── Parse search params ──────────────────────────────────────────────────
  const rawWindow = typeof searchParams?.windowDays === "string" ? searchParams.windowDays : "21";
  const windowDays: WindowDays = isValidWindow(rawWindow) ? (Number(rawWindow) as WindowDays) : 21;

  const departmentId =
    typeof searchParams?.departmentId === "string" ? searchParams.departmentId : "";
  const teacherMembershipId =
    typeof searchParams?.teacherMembershipId === "string" ? searchParams.teacherMembershipId : "";
  const yearGroup =
    typeof searchParams?.yearGroup === "string" ? searchParams.yearGroup.trim() : "";
  const subject =
    typeof searchParams?.subject === "string" ? searchParams.subject.trim() : "";

  // ─── HOD scoping ──────────────────────────────────────────────────────────
  let hodScopedTeacherIds: string[] | null = null;

  if (user.role === "HOD" && hodDepartmentIds.length > 0) {
    const deptMembers = await (prisma as any).departmentMembership.findMany({
      where: { tenantId: user.tenantId, departmentId: { in: hodDepartmentIds } },
      select: { userId: true },
    });
    hodScopedTeacherIds = (deptMembers as any[]).map((m: any) => m.userId);
  }

  // ─── Build observation query ──────────────────────────────────────────────
  const obsWhere: any = { tenantId: user.tenantId };

  const windowStart = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);
  obsWhere.observedAt = { gte: windowStart };

  if (hodScopedTeacherIds) {
    obsWhere.observedTeacherId = { in: hodScopedTeacherIds };
  }

  if (departmentId) {
    const deptMembers = await (prisma as any).departmentMembership.findMany({
      where: { tenantId: user.tenantId, departmentId },
      select: { userId: true },
    });
    const deptUserIds = (deptMembers as any[]).map((m: any) => m.userId);
    if (hodScopedTeacherIds) {
      const intersection = deptUserIds.filter((id: string) => hodScopedTeacherIds!.includes(id));
      obsWhere.observedTeacherId = { in: intersection };
    } else {
      obsWhere.observedTeacherId = { in: deptUserIds };
    }
  }

  if (teacherMembershipId) {
    obsWhere.observedTeacherId = teacherMembershipId;
  }

  if (yearGroup) {
    obsWhere.yearGroup = yearGroup;
  }

  if (subject) {
    obsWhere.subject = { contains: subject, mode: "insensitive" };
  }

  // ─── Fetch data ───────────────────────────────────────────────────────────
  const [observations, departments] = await Promise.all([
    (prisma as any).observation.findMany({
      where: obsWhere,
      include: {
        observedTeacher: { select: { fullName: true } },
        observer: { select: { fullName: true } },
        signals: { select: { signalKey: true, valueKey: true, notObserved: true } },
      },
      orderBy: { observedAt: "desc" },
      take: 200,
    }),
    (prisma as any).department.findMany({
      where: { tenantId: user.tenantId },
      orderBy: { name: "asc" },
    }),
  ]);

  const obsList = observations as any[];

  const hasFilters = departmentId || teacherMembershipId || yearGroup || subject;

  // ─── Render ───────────────────────────────────────────────────────────────
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
        title="Observations"
        subtitle="Recent classroom observations with signal coverage details."
      />

      {/* ── Window selector + Filters ──────────────────────────────────────── */}
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

          {/* Department */}
          <label className="flex flex-col gap-1">
            <span className="text-[0.6875rem] font-medium text-muted">Department</span>
            <select name="departmentId" defaultValue={departmentId} className="field min-w-[160px]">
              <option value="">All departments</option>
              {(departments as any[]).map((d: any) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </label>

          {/* Year Group */}
          <label className="flex flex-col gap-1">
            <span className="text-[0.6875rem] font-medium text-muted">Year Group</span>
            <input
              name="yearGroup"
              type="text"
              defaultValue={yearGroup}
              placeholder="e.g. 10"
              className="field min-w-[90px]"
            />
          </label>

          {/* Subject */}
          <label className="flex flex-col gap-1">
            <span className="text-[0.6875rem] font-medium text-muted">Subject</span>
            <input
              name="subject"
              type="text"
              defaultValue={subject}
              placeholder="e.g. Maths"
              className="field min-w-[120px]"
            />
          </label>

          {/* Buttons */}
          <div className="flex items-end gap-2">
            <button
              type="submit"
              className="rounded-lg bg-accent px-4 py-2 text-[0.8125rem] font-semibold text-white calm-transition hover:bg-accentHover"
            >
              Apply
            </button>
            {hasFilters && (
              <Link
                href={`/explorer/observations?windowDays=${windowDays}`}
                className="rounded-lg border border-border bg-white/70 px-4 py-2 text-[0.8125rem] font-medium text-muted calm-transition hover:text-text"
              >
                Clear
              </Link>
            )}
            {showExport && (
              <form action="/api/explorer/export" method="POST" className="inline">
                <input type="hidden" name="view" value="observations" />
                <input type="hidden" name="windowDays" value={String(windowDays)} />
                {departmentId && <input type="hidden" name="departmentId" value={departmentId} />}
                {yearGroup && <input type="hidden" name="yearGroup" value={yearGroup} />}
                {subject && <input type="hidden" name="subject" value={subject} />}
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

      {/* ── Result count ───────────────────────────────────────────────────── */}
      <p className="mt-4 text-[0.8125rem] text-muted">
        {obsList.length > 0
          ? `${obsList.length} observation${obsList.length !== 1 ? "s" : ""} in the last ${windowDays} days`
          : "No observations match your filters"}
      </p>

      {/* ── Table / Empty state ────────────────────────────────────────────── */}
      {obsList.length === 0 ? (
        <div className="mt-4 flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-accent/10">
            <svg className="h-6 w-6 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
              <circle cx="11" cy="11" r="6.5" />
              <path d="m16.5 16.5 3 3" strokeLinecap="round" />
            </svg>
          </div>
          <p className="text-[0.875rem] font-semibold text-text">No observations found</p>
          <p className="mt-1 text-[0.8125rem] text-muted">Try widening your filters or window period.</p>
        </div>
      ) : (
        <div className="mt-4 overflow-hidden rounded-2xl border border-white/60 bg-white/60 backdrop-blur-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/30 bg-white/40 text-left text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-muted">
                  <th className="px-5 py-3">Date</th>
                  <th className="px-4 py-3">Teacher</th>
                  <th className="px-4 py-3">Year Group</th>
                  <th className="px-4 py-3">Subject</th>
                  <th className="px-4 py-3">Phase</th>
                  <th className="px-4 py-3">Signals</th>
                  <th className="px-4 py-3">Observer</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {obsList.map((obs: any) => {
                  const allSignals = (obs.signals ?? []) as any[];
                  const recordedCount = allSignals.filter(
                    (s: any) => s.valueKey && !s.notObserved,
                  ).length;
                  const totalSignals = allSignals.length;
                  const phase = (obs.phase as string) ?? "Unknown";

                  return (
                    <tr
                      key={obs.id}
                      className="group border-b border-border/20 last:border-0 calm-transition hover:bg-white/50"
                    >
                      {/* Date */}
                      <td className="px-5 py-3 whitespace-nowrap">
                        <Link
                          href={`/observe/${obs.id}`}
                          className="tabular-nums text-text calm-transition group-hover:text-accent"
                        >
                          {formatShortDate(obs.observedAt)}
                        </Link>
                      </td>

                      {/* Teacher */}
                      <td className="px-4 py-3">
                        <Link
                          href={`/observe/${obs.id}`}
                          className="flex items-center gap-2 min-w-0"
                        >
                          <Avatar name={obs.observedTeacher?.fullName ?? "?"} size="sm" />
                          <span className="truncate font-semibold text-text calm-transition group-hover:text-accent">
                            {obs.observedTeacher?.fullName ?? "—"}
                          </span>
                        </Link>
                      </td>

                      {/* Year Group */}
                      <td className="px-4 py-3 text-muted">
                        {obs.yearGroup ? `Y${obs.yearGroup}` : "—"}
                      </td>

                      {/* Subject */}
                      <td className="px-4 py-3 text-text">
                        {obs.subject ?? "—"}
                      </td>

                      {/* Phase pill */}
                      <td className="px-4 py-3">
                        <StatusPill variant={phaseVariant(phase)} size="sm">
                          {formatPhaseLabel(phase)}
                        </StatusPill>
                      </td>

                      {/* Signals */}
                      <td className="px-4 py-3 tabular-nums text-muted">
                        {totalSignals > 0
                          ? `${recordedCount}/${totalSignals}`
                          : "—"}
                      </td>

                      {/* Observer */}
                      <td className="px-4 py-3 text-muted">
                        {obs.observer?.fullName ?? "—"}
                      </td>

                      {/* View button */}
                      <td className="pr-4 py-3 text-right">
                        <Link
                          href={`/observe/${obs.id}`}
                          className="inline-flex items-center gap-1 rounded-lg border border-border bg-white/70 px-3 py-1.5 text-[0.75rem] font-medium text-muted calm-transition hover:text-accent hover:border-accent/30"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <p className="mt-8 text-[0.75rem] text-muted">
        Explorer · Observations · {windowDays}d window
      </p>
    </>
  );
}
