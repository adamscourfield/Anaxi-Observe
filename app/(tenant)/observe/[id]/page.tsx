import Link from "next/link";
import { notFound } from "next/navigation";
import { getSessionUserOrThrow } from "@/lib/auth";
import { requireFeature } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { canViewObservation } from "@/modules/authz";
import { SIGNAL_DEFINITIONS } from "@/modules/observations/signalDefinitions";
import { getTenantSignalLabels } from "@/modules/observations/tenantSignalLabels";
import { ClearDraftOnSuccess } from "../components/ClearDraftOnSuccess";
import { PrintExportButtons } from "../components/PrintExportButtons";

const SCALE_DISPLAY: Record<string, { label: string; color: string; dot: string; bar: string }> = {
  LIMITED:    { label: "Limited",    color: "bg-scale-limited-bg text-scale-limited-text",         dot: "bg-scale-limited-bar",    bar: "bg-scale-limited-bar" },
  SOME:       { label: "Some",       color: "bg-scale-some-bg text-scale-some-text",               dot: "bg-scale-some-bar",       bar: "bg-scale-some-bar" },
  CONSISTENT: { label: "Consistent", color: "bg-scale-consistent-bg text-scale-consistent-text",   dot: "bg-scale-consistent-bar", bar: "bg-scale-consistent-bar" },
  STRONG:     { label: "Strong",     color: "bg-scale-strong-bg text-scale-strong-text",           dot: "bg-scale-strong-bar",     bar: "bg-scale-strong-bar" },
};

function initials(name: string) {
  return name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
}

function formatRole(role: string) {
  return role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

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
    (prisma as any).departmentMembership.findMany({
      where: { userId: observation.observedTeacherId },
      include: { department: true },
    }),
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

  // Teacher department name
  const teacherDept = (observedDeptMemberships as any[])[0]?.department?.fullName ?? null;
  const teacherName: string = observation.observedTeacher?.fullName ?? "Unknown Teacher";
  const observerName: string = observation.observer?.fullName ?? "—";

  // Summary stats
  const scaleCounts = { LIMITED: 0, SOME: 0, CONSISTENT: 0, STRONG: 0 };
  for (const sig of SIGNAL_DEFINITIONS as any[]) {
    const v = signalMap.get(sig.key)?.valueKey as keyof typeof scaleCounts;
    if (v && v in scaleCounts) scaleCounts[v]++;
  }

  const observedAt = new Date(observation.observedAt);
  const dateLabel = observedAt.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const dateTimeLabel = observedAt.toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
  }).toUpperCase() + " · " + observedAt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) + " GMT";

  const sessionLabel = [observation.subject, observation.yearGroup ? `Year ${observation.yearGroup}` : null]
    .filter(Boolean).join(" — ");

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-12">
      <ClearDraftOnSuccess draftKey={draftKey} />

      {/* Page header */}
      <div>
        <Link
          href="/observe/history"
          className="inline-flex items-center gap-1.5 text-[0.8125rem] font-medium text-muted calm-transition hover:text-text print:hidden"
        >
          <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5">
            <path d="M10 3.5 5.5 8l4.5 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Observation history
        </Link>

        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-[1.625rem] font-bold leading-tight text-text">
              Observation Review — {dateLabel}
            </h1>
            <p className="mt-1 text-[0.875rem] text-muted">
              {observation.subject}{observation.classCode ? ` · ${observation.classCode}` : ""}
              {observation.yearGroup ? ` · Year ${observation.yearGroup}` : ""}
            </p>
          </div>
          <PrintExportButtons />
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_288px]">

        {/* ── Left: main content ── */}
        <div className="space-y-6 min-w-0">

          {/* Signal Summary */}
          <div className="overflow-hidden rounded-2xl glass-card">
            <div className="border-b border-border/20 px-6 py-4">
              <h2 className="text-[0.875rem] font-semibold text-text">Signal Summary</h2>
            </div>

            {/* Two-column signal table */}
            <div className="grid grid-cols-1 sm:grid-cols-2">
              {(SIGNAL_DEFINITIONS as any[]).map((signal, idx) => {
                const override = (labelMap as any)[signal.key];
                const displayName = override?.displayName || signal.displayNameDefault;
                const value = signalMap.get(signal.key);
                const scaleKey = value?.valueKey as string | undefined;
                const display = scaleKey ? SCALE_DISPLAY[scaleKey] : null;
                const isSkipped = value?.notObserved && !value?.valueKey;

                const total = (SIGNAL_DEFINITIONS as any[]).length;
                const isEven = idx % 2 === 0;
                const lastRowStart = total % 2 === 0 ? total - 2 : total - 1;
                const isLastRow = idx >= lastRowStart;

                return (
                  <div
                    key={signal.key}
                    className={[
                      "flex items-center justify-between gap-3 px-5 py-3",
                      !isLastRow ? "border-b border-border/20" : "",
                      isEven ? "sm:border-r sm:border-border/20" : "",
                    ].join(" ")}
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className={`h-2 w-2 shrink-0 rounded-full ${
                        display?.dot ?? (isSkipped ? "bg-outline-variant" : "bg-surface-container-high")
                      }`} />
                      <span className="truncate text-[0.8125rem] font-medium text-text">{displayName}</span>
                    </div>
                    <div className="shrink-0">
                      {display ? (
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[0.6875rem] font-bold uppercase tracking-wide ${display.color}`}>
                          {display.label}
                        </span>
                      ) : isSkipped ? (
                        <span className="text-[0.75rem] text-muted">Skipped</span>
                      ) : (
                        <span className="text-[0.75rem] text-muted">—</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Scale count summary row */}
            <div className="grid grid-cols-4 divide-x divide-border/30 border-t border-border/30">
              {(["STRONG", "CONSISTENT", "SOME", "LIMITED"] as const).map((key) => {
                const d = SCALE_DISPLAY[key];
                return (
                  <div key={key} className="flex flex-col items-center py-3">
                    <span className={`text-[1.125rem] font-bold tabular-nums ${
                      key === "LIMITED" ? "text-scale-limited-text" :
                      key === "SOME" ? "text-scale-some-text" :
                      key === "CONSISTENT" ? "text-scale-consistent-text" :
                      "text-scale-strong-text"
                    }`}>
                      {scaleCounts[key]}
                    </span>
                    <span className="mt-0.5 text-[0.6875rem] font-medium text-muted">{d.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Concluding Reflections */}
          {observation.contextNote && (
            <div className="overflow-hidden rounded-2xl glass-card">
              <div className="border-b border-border/20 px-6 py-4">
                <h2 className="text-[0.875rem] font-semibold text-text">Concluding Reflections</h2>
              </div>
              <div className="px-6 py-5">
                <blockquote className="border-l-2 border-accent/40 pl-4 text-[0.9375rem] leading-relaxed text-text italic">
                  &ldquo;{observation.contextNote}&rdquo;
                </blockquote>

                {/* Observer sign-off */}
                <div className="mt-5 flex items-center gap-3 border-t border-border/20 pt-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/10 text-[0.6875rem] font-bold text-accent">
                    {initials(observerName)}
                  </div>
                  <div>
                    <p className="text-[0.8125rem] font-semibold text-text">
                      {observerName} · Observed &amp; Authenticated
                    </p>
                    <p className="text-[0.75rem] text-muted">{dateTimeLabel}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Right: Sidebar ── */}
        <div className="space-y-4">

          {/* Teacher profile card */}
          <div className="overflow-hidden rounded-2xl bg-on-surface/5 ring-1 ring-border/40">
            <div className="px-5 pt-5 pb-4">
              {/* Avatar + name */}
              <div className="mb-4 flex flex-col items-center text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent/15 text-[0.9375rem] font-bold text-accent ring-2 ring-accent/20">
                  {initials(teacherName)}
                </div>
                <h3 className="mt-3 text-[0.9375rem] font-bold leading-tight text-text">{teacherName}</h3>
                {teacherDept && (
                  <p className="mt-0.5 text-[0.75rem] text-muted">
                    {formatRole(observation.observedTeacher?.role ?? "Teacher")} · {teacherDept}
                  </p>
                )}
                {!teacherDept && (
                  <p className="mt-0.5 text-[0.75rem] text-muted">
                    {formatRole(observation.observedTeacher?.role ?? "Teacher")}
                  </p>
                )}
              </div>

              {/* View Full Dossier */}
              <Link
                href={`/explorer/teachers?teacherId=${observation.observedTeacherId}`}
                className="flex w-full items-center justify-center rounded-lg border border-border/50 bg-surface-container-lowest/60 px-4 py-2 text-[0.8125rem] font-medium text-muted calm-transition hover:border-accent/30 hover:text-accent"
              >
                View Full Dossier
              </Link>
            </div>

            {/* Session Context */}
            <div className="border-t border-border/20 px-5 py-4">
              <p className="mb-3 text-[0.5625rem] font-bold uppercase tracking-[0.1em] text-muted">
                Session Context
              </p>
              <div className="space-y-2.5">
                <div>
                  <p className="text-[0.5625rem] font-semibold uppercase tracking-wider text-muted">Class</p>
                  <p className="mt-0.5 text-[0.8125rem] font-semibold text-text">{sessionLabel}</p>
                </div>
                <div>
                  <p className="text-[0.5625rem] font-semibold uppercase tracking-wider text-muted">Observer</p>
                  <p className="mt-0.5 text-[0.8125rem] font-semibold text-text">{observerName}</p>
                </div>
                <div>
                  <p className="text-[0.5625rem] font-semibold uppercase tracking-wider text-muted">Status</p>
                  <div className="mt-0.5 flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-scale-strong-bar" />
                    <span className="text-[0.8125rem] font-semibold text-scale-strong-text">Completed</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Internal Links */}
          <div className="overflow-hidden rounded-2xl glass-card">
            <div className="border-b border-border/20 px-5 py-3">
              <p className="text-[0.5625rem] font-bold uppercase tracking-[0.1em] text-muted">Internal Links</p>
            </div>
            <div className="divide-y divide-border/20">
              <Link
                href={`/observe/history?teacherId=${observation.observedTeacherId}`}
                className="flex items-center justify-between px-5 py-3 text-[0.8125rem] font-medium text-muted calm-transition hover:text-text"
              >
                Previous Observations
                <svg className="h-3.5 w-3.5 shrink-0 text-border" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
              {user.role !== "TEACHER" && (
                <Link
                  href="/observe/new"
                  className="flex items-center justify-between px-5 py-3 text-[0.8125rem] font-medium text-muted calm-transition hover:text-text"
                >
                  New Observation
                  <svg className="h-3.5 w-3.5 shrink-0 text-border" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </Link>
              )}
              <Link
                href={`/explorer/observations`}
                className="flex items-center justify-between px-5 py-3 text-[0.8125rem] font-medium text-muted calm-transition hover:text-text"
              >
                Observation Explorer
                <svg className="h-3.5 w-3.5 shrink-0 text-border" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
