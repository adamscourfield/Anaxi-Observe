import Link from "next/link";
import { getSessionUserOrThrow } from "@/lib/auth";
import { requireFeature } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { formatPhaseLabel } from "@/modules/observations/phaseLabel";

const SCALE_COLORS: Record<string, string> = {
  LIMITED:    "bg-rose-400",
  SOME:       "bg-amber-400",
  CONSISTENT: "bg-blue-500",
  STRONG:     "bg-emerald-500",
};

const SCALE_BADGE: Record<string, string> = {
  LIMITED:    "bg-rose-50 text-rose-700 border-rose-200",
  SOME:       "bg-amber-50 text-amber-700 border-amber-200",
  CONSISTENT: "bg-blue-50 text-blue-700 border-blue-200",
  STRONG:     "bg-emerald-50 text-emerald-700 border-emerald-200",
};

const PHASE_BADGE: Record<string, string> = {
  INSTRUCTION:           "bg-indigo-50 text-indigo-700 border-indigo-200",
  GUIDED_PRACTICE:       "bg-emerald-50 text-emerald-700 border-emerald-200",
  INDEPENDENT_PRACTICE:  "bg-violet-50 text-violet-700 border-violet-200",
  UNKNOWN:               "bg-slate-50 text-slate-600 border-slate-200",
};

export default async function ObservationHistoryPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
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
        select: { userId: true },
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
          },
        }
      : {}),
  };

  let allowedTeacherIds: Set<string> | null = null;

  if (user.role === "TEACHER") {
    where.observedTeacherId = user.id;
    allowedTeacherIds = new Set([user.id]);
  } else if (user.role === "ADMIN" || user.role === "SLT" || user.role === "SUPER_ADMIN") {
    if (teacherId) where.observedTeacherId = teacherId;
  } else {
    allowedTeacherIds = new Set<string>([...Array.from(hodVisibleUserIds), ...Array.from(coachVisibleUserIds)]);
    if (teacherId) {
      where.observedTeacherId = allowedTeacherIds.has(teacherId) ? teacherId : "__NO_MATCH__";
    } else {
      where.observedTeacherId = { in: Array.from(allowedTeacherIds) };
    }
  }

  const visibleTeachers = allowedTeacherIds
    ? (teachers as any[]).filter((t: any) => (allowedTeacherIds as Set<string>).has(t.id))
    : (teachers as any[]);

  const scopedFilterWhere: any = { tenantId: user.tenantId };
  if (user.role === "TEACHER") scopedFilterWhere.observedTeacherId = user.id;
  else if (allowedTeacherIds) scopedFilterWhere.observedTeacherId = { in: Array.from(allowedTeacherIds) };

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

  const hasFilters = teacherId || subject || yearGroup || observerId || from || to;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[1.5rem] font-bold tracking-tight text-text">Observation history</h1>
          <p className="mt-1 text-[0.9375rem] text-muted">
            {(observations as any[]).length > 0
              ? `${(observations as any[]).length} observation${(observations as any[]).length !== 1 ? "s" : ""} found`
              : "No observations match your filters"}
          </p>
        </div>
        {user.role !== "TEACHER" && (
          <Link
            href="/observe/new"
            className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-[0.875rem] font-semibold text-white shadow-sm calm-transition hover:bg-accentHover"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New observation
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="overflow-hidden rounded-2xl border border-white/60 bg-white/60 backdrop-blur-sm">
        <div className="border-b border-border/30 px-5 py-3">
          <p className="text-[0.75rem] font-semibold uppercase tracking-[0.08em] text-muted">Filters</p>
        </div>
        <form className="flex flex-wrap items-end gap-3 p-4">
          {user.role !== "TEACHER" && (
            <>
              <select name="teacherId" defaultValue={teacherId} className="field min-w-[160px] flex-1">
                <option value="">All teachers</option>
                {visibleTeachers.map((t: any) => (
                  <option key={t.id} value={t.id}>{t.fullName}</option>
                ))}
              </select>
              <select name="observerId" defaultValue={observerId} className="field min-w-[160px] flex-1">
                <option value="">All observers</option>
                {(observers as any[]).map((o: any) => (
                  <option key={o.id} value={o.id}>{o.fullName}</option>
                ))}
              </select>
            </>
          )}
          <select name="subject" defaultValue={subject} className="field min-w-[130px] flex-1">
            <option value="">All subjects</option>
            {(distinctSubjects as { subject: string }[]).map((r) => (
              <option key={r.subject} value={r.subject}>{r.subject}</option>
            ))}
          </select>
          <select name="yearGroup" defaultValue={yearGroup} className="field min-w-[130px] flex-1">
            <option value="">All years</option>
            {(distinctYearGroups as { yearGroup: string }[]).map((r) => (
              <option key={r.yearGroup} value={r.yearGroup}>Year {r.yearGroup}</option>
            ))}
          </select>
          <input name="from" type="date" defaultValue={from} className="field" />
          <input name="to" type="date" defaultValue={to} className="field" />
          <div className="flex gap-2">
            <button
              type="submit"
              className="rounded-lg bg-accent px-4 py-2 text-[0.8125rem] font-semibold text-white calm-transition hover:bg-accentHover"
            >
              Apply
            </button>
            {hasFilters && (
              <Link
                href="/observe/history"
                className="rounded-lg border border-border bg-white/70 px-4 py-2 text-[0.8125rem] font-medium text-muted calm-transition hover:text-text"
              >
                Clear
              </Link>
            )}
          </div>
        </form>
      </div>

      {/* Results */}
      {(observations as any[]).length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-accent/10">
            <svg className="h-6 w-6 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
              <circle cx="11" cy="11" r="6.5" /><path d="m16.5 16.5 3 3" strokeLinecap="round" />
            </svg>
          </div>
          <p className="text-[0.875rem] font-semibold text-text">No observations found</p>
          <p className="mt-1 text-[0.8125rem] text-muted">Try widening your filters.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-white/60 bg-white/60 backdrop-blur-sm">
          {/* Table header */}
          <div className="border-b border-border/30 bg-white/40">
            <div className={`grid items-center gap-4 px-5 py-3 text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-muted ${
              user.role !== "TEACHER" ? "grid-cols-[1fr_1fr_1fr_80px_100px_80px_40px]" : "grid-cols-[1fr_1fr_80px_100px_80px_40px]"
            }`}>
              <span>Teacher</span>
              {user.role !== "TEACHER" && <span>Observer</span>}
              <span>Subject · Year</span>
              <span>Date</span>
              <span>Phase</span>
              <span>Signals</span>
              <span />
            </div>
          </div>

          {/* Rows */}
          <div>
            {(observations as any[]).map((obs: any, idx: number) => {
              const signalValues = (obs.signals as any[]).filter((s: any) => s.valueKey);
              const phase = obs.phase as string;
              const phaseBadge = PHASE_BADGE[phase] ?? PHASE_BADGE.UNKNOWN;
              const isLast = idx === (observations as any[]).length - 1;

              return (
                <Link
                  key={obs.id}
                  href={`/observe/${obs.id}`}
                  className={`group grid items-center gap-4 px-5 py-3.5 calm-transition hover:bg-white/50 ${!isLast ? "border-b border-border/20" : ""} ${
                    user.role !== "TEACHER" ? "grid-cols-[1fr_1fr_1fr_80px_100px_80px_40px]" : "grid-cols-[1fr_1fr_80px_100px_80px_40px]"
                  }`}
                >
                  {/* Teacher */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="hidden h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/10 text-[10px] font-bold text-accent sm:flex">
                      {(obs.observedTeacher?.fullName ?? "?").split(" ").slice(0, 2).map((n: string) => n[0]).join("")}
                    </div>
                    <span className="truncate text-[0.875rem] font-semibold text-text">
                      {obs.observedTeacher?.fullName ?? "—"}
                    </span>
                  </div>

                  {/* Observer */}
                  {user.role !== "TEACHER" && (
                    <span className="truncate text-[0.8125rem] text-muted">
                      {obs.observer?.fullName ?? "—"}
                    </span>
                  )}

                  {/* Subject + Year */}
                  <div className="min-w-0">
                    <span className="truncate text-[0.8125rem] text-text">{obs.subject}</span>
                    <span className="block text-[0.75rem] text-muted">Year {obs.yearGroup}</span>
                  </div>

                  {/* Date */}
                  <span className="text-[0.8125rem] tabular-nums text-muted">
                    {new Date(obs.observedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                  </span>

                  {/* Phase */}
                  <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[0.6875rem] font-semibold ${phaseBadge}`}>
                    {formatPhaseLabel(phase)}
                  </span>

                  {/* Signal dots */}
                  <div className="flex items-center gap-0.5">
                    {signalValues.slice(0, 8).map((s: any) => (
                      <span
                        key={s.id}
                        className={`h-2 w-2 rounded-full ${SCALE_COLORS[s.valueKey] ?? "bg-slate-300"}`}
                      />
                    ))}
                  </div>

                  <svg className="h-3.5 w-3.5 text-border calm-transition group-hover:text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
