import Link from "next/link";
import { getSessionUserOrThrow } from "@/lib/auth";
import { requireFeature } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { formatPhaseLabel } from "@/modules/observations/phaseLabel";

export default async function ObservePage() {
  const user = await getSessionUserOrThrow();
  await requireFeature(user.tenantId, "OBSERVATIONS");

  const canObserve = user.role !== "TEACHER";

  const [recentObs, totalCount] = await Promise.all([
    (prisma as any).observation.findMany({
      where: canObserve
        ? { tenantId: user.tenantId }
        : { tenantId: user.tenantId, observedTeacherId: user.id },
      include: { observedTeacher: true, observer: true, signals: true },
      orderBy: { observedAt: "desc" },
      take: 5,
    }),
    (prisma as any).observation.count({
      where: canObserve
        ? { tenantId: user.tenantId }
        : { tenantId: user.tenantId, observedTeacherId: user.id },
    }),
  ]);

  const SCALE_COLORS: Record<string, string> = {
    LIMITED: "bg-rose-400",
    SOME: "bg-amber-400",
    CONSISTENT: "bg-blue-500",
    STRONG: "bg-emerald-500",
  };

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-accent to-[#3a54a8] p-8 text-white shadow-lg">
        <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/5" />
        <div className="absolute -bottom-6 right-16 h-24 w-24 rounded-full bg-white/5" />
        <div className="relative">
          <p className="mb-1 text-[0.8125rem] font-semibold uppercase tracking-[0.1em] text-white/60">
            Observations
          </p>
          <h1 className="mb-2 text-[1.75rem] font-bold leading-tight tracking-tight">
            {canObserve ? "Capture what you see." : "Your observation record."}
          </h1>
          <p className="mb-6 max-w-lg text-[0.9375rem] leading-relaxed text-white/70">
            {canObserve
              ? "Deliberate, signal-based observation that builds a clear picture of teaching quality across your school."
              : "See the feedback and signals captured in your observations over time."}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            {canObserve && (
              <Link
                href="/observe/new"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-[0.875rem] font-bold text-accent shadow-md calm-transition hover:bg-white/90 hover:shadow-lg"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                New observation
              </Link>
            )}
            <Link
              href="/observe/history"
              className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-5 py-2.5 text-[0.875rem] font-semibold text-white backdrop-blur-sm calm-transition hover:bg-white/20"
            >
              View all
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          </div>
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Total observations", value: totalCount },
          { label: "This month", value: (recentObs as any[]).filter((o: any) => new Date(o.observedAt) >= new Date(new Date().getFullYear(), new Date().getMonth(), 1)).length },
          { label: "Signals tracked", value: 12 },
          { label: "4-point scale", value: "Calibrated" },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl border border-white/60 bg-white/60 px-4 py-4 backdrop-blur-sm">
            <p className="text-[0.75rem] font-medium text-muted">{label}</p>
            <p className="mt-1 text-[1.375rem] font-bold tabular-nums text-text">{value}</p>
          </div>
        ))}
      </div>

      {/* Recent observations */}
      {(recentObs as any[]).length > 0 && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[0.9375rem] font-semibold text-text">Recent observations</h2>
            <Link href="/observe/history" className="text-[0.8125rem] font-medium text-accent calm-transition hover:text-accentHover">
              See all →
            </Link>
          </div>
          <div className="space-y-2">
            {(recentObs as any[]).map((obs: any) => {
              const signalValues = (obs.signals as any[]).filter((s: any) => s.valueKey);
              return (
                <Link
                  key={obs.id}
                  href={`/observe/${obs.id}`}
                  className="group flex items-center gap-4 rounded-xl border border-white/60 bg-white/60 px-5 py-3.5 backdrop-blur-sm calm-transition hover:border-accent/20 hover:bg-white/80 hover:shadow-sm"
                >
                  {/* Avatar */}
                  <div className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/10 text-[12px] font-bold text-accent sm:flex">
                    {(obs.observedTeacher?.fullName ?? "?")
                      .split(" ")
                      .slice(0, 2)
                      .map((n: string) => n[0])
                      .join("")
                      .toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="truncate text-[0.875rem] font-semibold text-text">
                        {obs.observedTeacher?.fullName ?? "—"}
                      </span>
                      <span className="shrink-0 text-[0.75rem] text-muted">{obs.subject}</span>
                      <span className="shrink-0 text-[0.75rem] text-muted">· Yr {obs.yearGroup}</span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-2">
                      <span className="text-[0.75rem] text-muted">
                        {new Date(obs.observedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                      </span>
                      <span className="text-[0.6875rem] text-border">·</span>
                      <span className="text-[0.75rem] text-muted">{formatPhaseLabel(obs.phase)}</span>
                      {canObserve && obs.observer && (
                        <>
                          <span className="text-[0.6875rem] text-border">·</span>
                          <span className="text-[0.75rem] text-muted">by {obs.observer.fullName}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Signal dots */}
                  <div className="hidden shrink-0 items-center gap-1 sm:flex">
                    {signalValues.slice(0, 8).map((s: any) => (
                      <span
                        key={s.id}
                        className={`h-2 w-2 rounded-full ${SCALE_COLORS[s.valueKey] ?? "bg-slate-300"}`}
                        title={s.valueKey}
                      />
                    ))}
                  </div>

                  <svg className="h-4 w-4 shrink-0 text-muted calm-transition group-hover:text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {(recentObs as any[]).length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-accent/10">
            <svg className="h-6 w-6 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
              <circle cx="11" cy="11" r="6.5" />
              <path d="m16.5 16.5 3 3" strokeLinecap="round" />
            </svg>
          </div>
          <p className="text-[0.875rem] font-semibold text-text">No observations yet</p>
          <p className="mt-1 text-[0.8125rem] text-muted">
            {canObserve ? "Start your first observation to build a picture of teaching quality." : "Your observations will appear here once completed."}
          </p>
          {canObserve && (
            <Link
              href="/observe/new"
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white calm-transition hover:bg-accentHover"
            >
              Start first observation
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
