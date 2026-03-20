import Link from "next/link";
import { notFound } from "next/navigation";
import { getSessionUserOrThrow } from "@/lib/auth";
import { requireFeature } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { SectionHeader } from "@/components/ui/section-header";
import { StatusPill } from "@/components/ui/status-pill";
import { MetaText } from "@/components/ui/typography";
import {
  canViewExplorer,
  canViewBehaviourExplorer,
} from "@/modules/authz";
import { computeTeacherRiskIndex } from "@/modules/analysis/teacherRisk";
import { computeDepartmentPivot } from "@/modules/analysis/departmentPivot";
import { computeStudentRiskIndex } from "@/modules/analysis/studentRisk";
import { computeCohortPivot } from "@/modules/analysis/cohortPivot";
import { computeCpdPriorities } from "@/modules/analysis/cpdPriorities";

const WINDOW_DAYS = 21;

/* ─── Inline SVG icons ─────────────────────────────────────────────────────── */

function IconTeachers() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
    </svg>
  );
}

function IconDepartments() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
    </svg>
  );
}

function IconSignals() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
    </svg>
  );
}

function IconObservations() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </svg>
  );
}

function IconStudents() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a23.54 23.54 0 0 0-2.688 6.413A12.02 12.02 0 0 1 2.25 12c0-2.115.546-4.106 1.506-5.84A23.54 23.54 0 0 0 4.26 10.147ZM12 2.25l8.49 4.26a23.54 23.54 0 0 1 1.252 3.637 60.438 60.438 0 0 0-17.484 0 23.54 23.54 0 0 1 1.252-3.637L12 2.25ZM19.74 10.147a23.54 23.54 0 0 1 2.688 6.413A12.02 12.02 0 0 0 21.75 12c0-2.115-.546-4.106-1.506-5.84a23.54 23.54 0 0 0-.504 3.987Z" />
    </svg>
  );
}

function IconCohorts() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
    </svg>
  );
}

/* ─── Page ─────────────────────────────────────────────────────────────────── */

export default async function ExplorerPage({
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
  const canSeeBehaviour = canViewBehaviourExplorer(viewerContext);

  // ─── Fetch hub summary data in parallel ─────────────────────────────────────
  const since = new Date();
  since.setDate(since.getDate() - WINDOW_DAYS);

  const [
    teacherRiskRows,
    deptResult,
    cpdRows,
    obsCount,
    ...behaviourResults
  ] = await Promise.all([
    computeTeacherRiskIndex(user.tenantId, WINDOW_DAYS),
    computeDepartmentPivot(user.tenantId, WINDOW_DAYS),
    computeCpdPriorities(user.tenantId, WINDOW_DAYS),
    (prisma as any).observation.count({
      where: { tenantId: user.tenantId, observedAt: { gte: since } },
    }) as Promise<number>,
    ...(canSeeBehaviour
      ? [
          computeStudentRiskIndex(user.tenantId, WINDOW_DAYS, user.id),
          computeCohortPivot(user.tenantId, WINDOW_DAYS),
        ]
      : []),
  ]);

  // ─── Derive summary stats ───────────────────────────────────────────────────
  const driftingTeachers = teacherRiskRows.filter(
    (r) => r.status === "SIGNIFICANT_DRIFT" || r.status === "EMERGING_DRIFT",
  ).length;
  const totalTeachers = teacherRiskRows.length;

  const totalDepartments = deptResult.rows.length;
  const totalObsAcrossDepts = deptResult.rows.reduce((s, r) => s + r.observationCount, 0);

  const highPrioritySignals = cpdRows.filter((r) => r.priorityScore > 0.1).length;
  const totalSignals = cpdRows.length;

  let priorityStudents = 0;
  let totalStudents = 0;
  let yearGroupCount = 0;
  let totalStudentsCovered = 0;

  if (canSeeBehaviour && behaviourResults.length === 2) {
    const studentResult = behaviourResults[0] as Awaited<ReturnType<typeof computeStudentRiskIndex>>;
    const cohortResult = behaviourResults[1] as Awaited<ReturnType<typeof computeCohortPivot>>;

    priorityStudents = studentResult.rows.filter(
      (r) => r.band === "PRIORITY" || r.band === "URGENT",
    ).length;
    totalStudents = studentResult.rows.length;
    yearGroupCount = cohortResult.rows.length;
    totalStudentsCovered = cohortResult.rows.reduce((s, r) => s + r.studentsCovered, 0);
  }

  const computedAt = deptResult.computedAt;
  const computedAtStr = computedAt.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <PageHeader
        title="Explorer"
        subtitle="Data analysis command centre. Dive into performance, drift, and behaviour across your school."
        meta={
          <MetaText>
            {WINDOW_DAYS}d window · Updated {computedAtStr}
          </MetaText>
        }
      />

      {/* ── Instruction & Performance ──────────────────────────────────────── */}
      <SectionHeader title="Instruction & Performance" className="mt-2" />

      <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Teachers */}
        <Link href="/explorer?view=TEACHER_PRIORITIES&windowDays=21" className="block">
          <Card tone="interactive" className="flex h-full flex-col gap-3 p-5">
            <div className="flex items-center gap-2 text-accent">
              <IconTeachers />
              <span className="text-sm font-semibold">Teachers</span>
            </div>
            <p className="text-[13px] leading-snug text-muted">
              Risk index &amp; drift tracking across all observed teachers.
            </p>
            <div className="mt-auto flex items-end gap-3 pt-2">
              <span className="text-2xl font-bold tabular-nums text-text">{totalTeachers}</span>
              <MetaText>teachers tracked</MetaText>
            </div>
            {driftingTeachers > 0 ? (
              <StatusPill variant="warning" size="sm">
                {driftingTeachers} drifting
              </StatusPill>
            ) : (
              <StatusPill variant="success" size="sm">
                All stable
              </StatusPill>
            )}
          </Card>
        </Link>

        {/* Departments */}
        <Link href="/explorer?view=INSTRUCTION_DEPARTMENTS_PIVOT&windowDays=21" className="block">
          <Card tone="interactive" className="flex h-full flex-col gap-3 p-5">
            <div className="flex items-center gap-2 text-accent">
              <IconDepartments />
              <span className="text-sm font-semibold">Departments</span>
            </div>
            <p className="text-[13px] leading-snug text-muted">
              Aggregate signal performance broken down by department.
            </p>
            <div className="mt-auto flex items-end gap-3 pt-2">
              <span className="text-2xl font-bold tabular-nums text-text">{totalDepartments}</span>
              <MetaText>departments</MetaText>
            </div>
            <MetaText>{totalObsAcrossDepts} obs across depts</MetaText>
          </Card>
        </Link>

        {/* Signals */}
        <Link href="/explorer?view=CPD_SIGNALS&windowDays=21" className="block">
          <Card tone="interactive" className="flex h-full flex-col gap-3 p-5">
            <div className="flex items-center gap-2 text-accent">
              <IconSignals />
              <span className="text-sm font-semibold">Signals</span>
            </div>
            <p className="text-[13px] leading-snug text-muted">
              CPD signal priorities — where teachers are drifting most.
            </p>
            <div className="mt-auto flex items-end gap-3 pt-2">
              <span className="text-2xl font-bold tabular-nums text-text">{totalSignals}</span>
              <MetaText>signals tracked</MetaText>
            </div>
            {highPrioritySignals > 0 ? (
              <StatusPill variant="warning" size="sm">
                {highPrioritySignals} high priority
              </StatusPill>
            ) : (
              <StatusPill variant="success" size="sm">
                No high-priority signals
              </StatusPill>
            )}
          </Card>
        </Link>

        {/* Observations */}
        <Link href="/explorer?view=INSTRUCTION_LIST&windowDays=21" className="block">
          <Card tone="interactive" className="flex h-full flex-col gap-3 p-5">
            <div className="flex items-center gap-2 text-accent">
              <IconObservations />
              <span className="text-sm font-semibold">Observations</span>
            </div>
            <p className="text-[13px] leading-snug text-muted">
              Browse recent lesson observations and signal ratings.
            </p>
            <div className="mt-auto flex items-end gap-3 pt-2">
              <span className="text-2xl font-bold tabular-nums text-text">{obsCount}</span>
              <MetaText>in last {WINDOW_DAYS}d</MetaText>
            </div>
            <MetaText>Latest observation data</MetaText>
          </Card>
        </Link>
      </div>

      {/* ── Behaviour & Welfare ────────────────────────────────────────────── */}
      {canSeeBehaviour && (
        <>
          <SectionHeader title="Behaviour & Welfare" className="mt-10" />

          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Students */}
            <Link href="/explorer?view=BEHAVIOUR_STUDENTS_TABLE&windowDays=21" className="block">
              <Card tone="interactive" className="flex h-full flex-col gap-3 p-5">
                <div className="flex items-center gap-2 text-accent">
                  <IconStudents />
                  <span className="text-sm font-semibold">Students</span>
                </div>
                <p className="text-[13px] leading-snug text-muted">
                  Student risk index with attendance, detentions, and welfare flags.
                </p>
                <div className="mt-auto flex items-end gap-3 pt-2">
                  <span className="text-2xl font-bold tabular-nums text-text">{totalStudents}</span>
                  <MetaText>students tracked</MetaText>
                </div>
                {priorityStudents > 0 ? (
                  <StatusPill variant="error" size="sm">
                    {priorityStudents} priority / urgent
                  </StatusPill>
                ) : (
                  <StatusPill variant="success" size="sm">
                    No priority concerns
                  </StatusPill>
                )}
              </Card>
            </Link>

            {/* Cohorts */}
            <Link href="/explorer?view=BEHAVIOUR_COHORTS_PIVOT&windowDays=21" className="block">
              <Card tone="interactive" className="flex h-full flex-col gap-3 p-5">
                <div className="flex items-center gap-2 text-accent">
                  <IconCohorts />
                  <span className="text-sm font-semibold">Cohorts</span>
                </div>
                <p className="text-[13px] leading-snug text-muted">
                  Year-group behaviour trends — attendance, detentions, and more.
                </p>
                <div className="mt-auto flex items-end gap-3 pt-2">
                  <span className="text-2xl font-bold tabular-nums text-text">{yearGroupCount}</span>
                  <MetaText>year groups</MetaText>
                </div>
                <MetaText>{totalStudentsCovered} students covered</MetaText>
              </Card>
            </Link>
          </div>
        </>
      )}

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <p className="mt-10 text-[0.75rem] text-muted">
        Explorer · {WINDOW_DAYS}d window · {computedAtStr}
      </p>
    </>
  );
}
