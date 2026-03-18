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

const SCALE_LEVELS = ["STRONG", "CONSISTENT", "SOME", "LIMITED"] as const;

function formatShortDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

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
          {/* Desktop table (≥ md) */}
          <div className="hidden md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/30 bg-white/40 text-left text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-muted">
                  <th className="px-5 py-3">Teacher</th>
                  {user.role !== "TEACHER" && <th className="px-4 py-3">Observer</th>}
                  <th className="px-4 py-3">Subject · Year</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Phase</th>
                  <th className="px-4 py-3">Signals</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {(observations as any[]).map((obs: any) => {
                  const signalValues = (obs.signals as any[]).filter((s: any) => s.valueKey);
                  const phase = obs.phase as string;
                  const phaseBadge = PHASE_BADGE[phase] ?? PHASE_BADGE.UNKNOWN;

                  // Compute signal counts per scale level
                  const scaleCounts: Record<string, number> = {};
                  for (const s of signalValues) {
                    const k = s.valueKey as string;
                    scaleCounts[k] = (scaleCounts[k] ?? 0) + 1;
                  }

                  return (
                    <tr key={obs.id} className="group border-b border-border/20 last:border-0 calm-transition hover:bg-white/50">
                      <td className="px-5 py-3">
                        <Link href={`/observe/${obs.id}`} className="flex items-center gap-2.5 min-w-0">
                          <div className="hidden h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/10 text-[10px] font-bold text-accent sm:flex">
                            {(obs.observedTeacher?.fullName ?? "?").split(" ").slice(0, 2).map((n: string) => n[0]).join("")}
                          </div>
                          <span className="truncate font-semibold text-text group-hover:text-accent calm-transition">
                            {obs.observedTeacher?.fullName ?? "—"}
                          </span>
                        </Link>
                      </td>

                      {user.role !== "TEACHER" && (
                        <td className="px-4 py-3 text-muted">
                          {obs.observer?.fullName ?? "—"}
                        </td>
                      )}

                      <td className="px-4 py-3">
                        <span className="text-text">{obs.subject}</span>
                        <span className="ml-1.5 text-muted">Y{obs.yearGroup}</span>
                      </td>

                      <td className="px-4 py-3 tabular-nums text-muted whitespace-nowrap">
                        {formatShortDate(obs.observedAt)}
                      </td>

                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[0.6875rem] font-semibold ${phaseBadge}`}>
                          {formatPhaseLabel(phase)}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        {signalValues.length === 0 ? (
                          <span className="text-xs text-muted">—</span>
                        ) : (
                          <div className="flex items-center gap-1">
                            {SCALE_LEVELS.map((level) => {
                              const count = scaleCounts[level];
                              if (!count) return null;
                              return (
                                <span
                                  key={level}
                                  className={`inline-flex items-center gap-0.5 rounded-md border px-1.5 py-0.5 text-[0.6875rem] font-medium ${SCALE_BADGE[level]}`}
                                  title={`${count} ${level.toLowerCase()}`}
                                >
                                  <span className={`h-1.5 w-1.5 rounded-full ${SCALE_COLORS[level]}`} />
                                  {count}
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </td>

                      <td className="pr-4 py-3 text-right">
                        <Link href={`/observe/${obs.id}`}>
                          <svg className="h-3.5 w-3.5 text-border calm-transition group-hover:text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile card list (< md) */}
          <div className="md:hidden divide-y divide-border/20">
            {(observations as any[]).map((obs: any) => {
              const signalValues = (obs.signals as any[]).filter((s: any) => s.valueKey);
              const phase = obs.phase as string;
              const phaseBadge = PHASE_BADGE[phase] ?? PHASE_BADGE.UNKNOWN;

              const scaleCounts: Record<string, number> = {};
              for (const s of signalValues) {
                const k = s.valueKey as string;
                scaleCounts[k] = (scaleCounts[k] ?? 0) + 1;
              }

              return (
                <Link
                  key={obs.id}
                  href={`/observe/${obs.id}`}
                  className="group block px-4 py-3.5 calm-transition hover:bg-white/50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 shrink-0 flex items-center justify-center rounded-full bg-accent/10 text-[10px] font-bold text-accent">
                          {(obs.observedTeacher?.fullName ?? "?").split(" ").slice(0, 2).map((n: string) => n[0]).join("")}
                        </div>
                        <span className="truncate text-[0.875rem] font-semibold text-text">
                          {obs.observedTeacher?.fullName ?? "—"}
                        </span>
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.8125rem] text-muted">
                        <span>{obs.subject} · Y{obs.yearGroup}</span>
                        <span className="tabular-nums">
                          {formatShortDate(obs.observedAt)}
                        </span>
                        {user.role !== "TEACHER" && obs.observer?.fullName && (
                          <span>by {obs.observer.fullName}</span>
                        )}
                      </div>
                    </div>
                    <svg className="mt-1 h-4 w-4 shrink-0 text-border calm-transition group-hover:text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[0.6875rem] font-semibold ${phaseBadge}`}>
                      {formatPhaseLabel(phase)}
                    </span>
                    {signalValues.length > 0 && (
                      <>
                        {SCALE_LEVELS.map((level) => {
                          const count = scaleCounts[level];
                          if (!count) return null;
                          return (
                            <span
                              key={level}
                              className={`inline-flex items-center gap-0.5 rounded-md border px-1.5 py-0.5 text-[0.6875rem] font-medium ${SCALE_BADGE[level]}`}
                            >
                              <span className={`h-1.5 w-1.5 rounded-full ${SCALE_COLORS[level]}`} />
                              {count}
                            </span>
                          );
                        })}
                      </>
                    )}
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
