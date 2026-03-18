import Link from "next/link";
import { notFound } from "next/navigation";
import { getSessionUserOrThrow } from "@/lib/auth";
import { requireFeature } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { canViewObservation } from "@/modules/authz";
import { SIGNAL_DEFINITIONS } from "@/modules/observations/signalDefinitions";
import { getTenantSignalLabels } from "@/modules/observations/tenantSignalLabels";
import { formatPhaseLabel } from "@/modules/observations/phaseLabel";
import { ClearDraftOnSuccess } from "../components/ClearDraftOnSuccess";

const SCALE_DISPLAY: Record<string, { label: string; color: string; dot: string; bar: string }> = {
  LIMITED:    { label: "Limited",    color: "bg-rose-50 text-rose-700 border-rose-200",     dot: "bg-rose-500",    bar: "bg-rose-400" },
  SOME:       { label: "Some",       color: "bg-amber-50 text-amber-700 border-amber-200",   dot: "bg-amber-500",   bar: "bg-amber-400" },
  CONSISTENT: { label: "Consistent", color: "bg-blue-50 text-blue-700 border-blue-200",      dot: "bg-blue-600",    bar: "bg-blue-500" },
  STRONG:     { label: "Strong",     color: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-600", bar: "bg-emerald-500" },
};

const SCALE_WIDTH: Record<string, string> = {
  LIMITED: "w-1/4", SOME: "w-2/4", CONSISTENT: "w-3/4", STRONG: "w-full",
};

const PHASE_BADGE: Record<string, string> = {
  INSTRUCTION:           "bg-indigo-50 text-indigo-700 border-indigo-200",
  GUIDED_PRACTICE:       "bg-emerald-50 text-emerald-700 border-emerald-200",
  INDEPENDENT_PRACTICE:  "bg-violet-50 text-violet-700 border-violet-200",
  UNKNOWN:               "bg-slate-50 text-slate-600 border-slate-200",
};

export default async function ObservationDetailPage({ params }: { params: { id: string } }) {
  const user = await getSessionUserOrThrow();
  await requireFeature(user.tenantId, "OBSERVATIONS");

  const observation = await (prisma as any).observation.findFirst({
    where: { id: params.id, tenantId: user.tenantId },
    include: { observedTeacher: true, observer: true, signals: true },
  });
  if (!observation) notFound();

  const [hodMemberships, coachAssignments, observedDeptMemberships] = await Promise.all([
    (prisma as any).departmentMembership.findMany({ where: { userId: user.id, isHeadOfDepartment: true } }),
    (prisma as any).coachAssignment.findMany({ where: { coachUserId: user.id } }),
    (prisma as any).departmentMembership.findMany({ where: { userId: observation.observedTeacherId } }),
  ]);

  const viewer = {
    userId: user.id,
    role: user.role,
    hodDepartmentIds: (hodMemberships as any[]).map((m: any) => m.departmentId),
    coacheeUserIds: (coachAssignments as any[]).map((a: any) => a.coacheeUserId),
  };

  const canView = canViewObservation(viewer, {
    observedUserId: observation.observedTeacherId,
    observerUserId: observation.observerId,
    observedUserDepartmentIds: (observedDeptMemberships as any[]).map((m: any) => m.departmentId),
  });
  if (!canView) throw new Error("FORBIDDEN");

  const labelMap = await getTenantSignalLabels(user.tenantId);
  const signalMap = new Map((observation.signals as any[]).map((s: any) => [s.signalKey, s]));
  const draftKey = `observation-draft:${user.tenantId}:${user.id}`;

  const phase = observation.phase as string;
  const phaseBadge = PHASE_BADGE[phase] ?? PHASE_BADGE.UNKNOWN;

  // Summary stats
  const ratedSignals = (SIGNAL_DEFINITIONS as any[]).filter((sig) => signalMap.get(sig.key)?.valueKey);
  const scaleCounts = { LIMITED: 0, SOME: 0, CONSISTENT: 0, STRONG: 0 };
  for (const sig of ratedSignals) {
    const v = signalMap.get(sig.key)?.valueKey as keyof typeof scaleCounts;
    if (v && v in scaleCounts) scaleCounts[v]++;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <ClearDraftOnSuccess draftKey={draftKey} />

      {/* Back */}
      <Link
        href="/observe/history"
        className="inline-flex items-center gap-1.5 text-[0.8125rem] font-medium text-muted calm-transition hover:text-text"
      >
        <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5">
          <path d="M10 3.5 5.5 8l4.5 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Observation history
      </Link>

      {/* Hero card */}
      <div className="overflow-hidden rounded-2xl border border-white/60 bg-white/70 backdrop-blur-sm">
        <div className="bg-gradient-to-r from-accent/5 to-transparent px-6 py-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              {/* Teacher */}
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/10 text-[13px] font-bold text-accent">
                  {(observation.observedTeacher?.fullName ?? "?")
                    .split(" ")
                    .slice(0, 2)
                    .map((n: string) => n[0])
                    .join("")
                    .toUpperCase()}
                </div>
                <div>
                  <h1 className="text-[1.25rem] font-bold leading-tight text-text">
                    {observation.observedTeacher?.fullName ?? "Unknown teacher"}
                  </h1>
                  <p className="text-[0.8125rem] text-muted">
                    Observed by {observation.observer?.fullName ?? "—"}
                  </p>
                </div>
              </div>
            </div>

            {/* Phase badge */}
            <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[0.75rem] font-semibold ${phaseBadge}`}>
              {formatPhaseLabel(phase)}
            </span>
          </div>

          {/* Metadata chips */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {[
              {
                icon: <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>,
                text: new Date(observation.observedAt).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "long", year: "numeric" }),
              },
              { icon: null, text: observation.subject },
              { icon: null, text: `Year ${observation.yearGroup}` },
              ...(observation.classCode ? [{ icon: null, text: observation.classCode }] : []),
            ].map(({ icon, text }) => (
              <span
                key={text}
                className="flex items-center gap-1.5 rounded-full border border-border/40 bg-white/70 px-3 py-1 text-[0.75rem] font-medium text-text"
              >
                {icon}
                {text}
              </span>
            ))}
          </div>

          {/* Context note */}
          {observation.contextNote && (
            <div className="mt-4 rounded-xl border border-border/40 bg-white/60 px-4 py-3">
              <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.07em] text-muted">Observer note</p>
              <p className="mt-1 text-[0.875rem] leading-relaxed text-text">{observation.contextNote}</p>
            </div>
          )}
        </div>

        {/* Score summary bar */}
        <div className="grid grid-cols-4 divide-x divide-border/30 border-t border-border/30">
          {(["STRONG", "CONSISTENT", "SOME", "LIMITED"] as const).map((key) => {
            const d = SCALE_DISPLAY[key];
            return (
              <div key={key} className="flex flex-col items-center py-3">
                <span className={`text-[1.125rem] font-bold tabular-nums ${key === "LIMITED" ? "text-rose-700" : key === "SOME" ? "text-amber-700" : key === "CONSISTENT" ? "text-blue-700" : "text-emerald-700"}`}>
                  {scaleCounts[key]}
                </span>
                <span className="mt-0.5 text-[0.6875rem] font-medium text-muted">{d.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Next steps */}
      {user.role !== "TEACHER" && (
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/observe/history?teacherId=${observation.observedTeacherId}`}
            className="rounded-lg border border-border/60 bg-white/70 px-3.5 py-2 text-[0.8125rem] font-medium text-muted backdrop-blur-sm calm-transition hover:border-accent/30 hover:text-accent"
          >
            All observations for this teacher →
          </Link>
          <Link
            href="/observe/new"
            className="rounded-lg border border-accent/30 bg-accent/5 px-3.5 py-2 text-[0.8125rem] font-medium text-accent calm-transition hover:bg-accent/10"
          >
            New observation →
          </Link>
        </div>
      )}

      {/* Signals */}
      <div>
        <h2 className="mb-3 text-[0.875rem] font-semibold uppercase tracking-[0.07em] text-muted">Signal records</h2>
        <div className="overflow-hidden rounded-2xl border border-white/60 bg-white/70 backdrop-blur-sm">
          {(SIGNAL_DEFINITIONS as any[]).map((signal, idx) => {
            const override = (labelMap as any)[signal.key];
            const displayName = override?.displayName || signal.displayNameDefault;
            const description = override?.description || signal.descriptionDefault;
            const value = signalMap.get(signal.key);
            const scaleKey = value?.valueKey as string | undefined;
            const display = scaleKey ? SCALE_DISPLAY[scaleKey] : null;
            const isSkipped = value?.notObserved && !value?.valueKey;
            const isLast = idx === (SIGNAL_DEFINITIONS as any[]).length - 1;

            return (
              <div
                key={signal.key}
                className={`px-5 py-4 ${!isLast ? "border-b border-border/20" : ""}`}
              >
                <div className="flex items-start gap-4">
                  {/* Left: dot + name */}
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${display?.dot ?? (isSkipped ? "bg-slate-300" : "bg-slate-200")}`} />
                    <div className="min-w-0">
                      <p className="text-[0.875rem] font-semibold leading-snug text-text">{displayName}</p>
                      <p className="mt-0.5 text-[0.75rem] leading-relaxed text-muted line-clamp-2">{description}</p>
                    </div>
                  </div>

                  {/* Right: rating */}
                  <div className="shrink-0 text-right">
                    {display ? (
                      <div>
                        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[0.75rem] font-semibold ${display.color}`}>
                          {display.label}
                        </span>
                        {/* Mini bar */}
                        <div className="mt-1.5 h-1 w-16 overflow-hidden rounded-full bg-slate-100">
                          <div className={`h-1 rounded-full calm-transition ${display.bar} ${SCALE_WIDTH[scaleKey!] ?? "w-0"}`} />
                        </div>
                      </div>
                    ) : isSkipped ? (
                      <span className="text-[0.75rem] text-muted">Skipped</span>
                    ) : (
                      <span className="text-[0.75rem] text-muted">—</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
