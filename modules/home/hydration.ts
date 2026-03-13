import { prisma } from "@/lib/prisma";
import { SessionUser } from "@/lib/types";
import {
  CpdPriorityRow,
  computeCpdPriorities,
  getTopImprovingSignals,
} from "@/modules/analysis/cpdPriorities";
import {
  computeTeacherRiskIndex,
  computeTeacherSignalProfile,
  TeacherRiskRow,
} from "@/modules/analysis/teacherRisk";
import { computeCohortPivot, CohortPivotRow } from "@/modules/analysis/cohortPivot";
import { computeStudentRiskIndex, StudentRiskRow } from "@/modules/analysis/studentRisk";
import { HomeAssembly } from "@/modules/home/assembler";

type PrismaAny = Record<string, Record<string, (...args: unknown[]) => unknown>>;

async function safe<T>(task: Promise<T>, fallback: T): Promise<T> {
  try {
    return await task;
  } catch {
    return fallback;
  }
}

export async function hydrateLeadershipHomeData({
  user,
  windowDays,
  hasLeaveFeature,
  hasOnCallFeature,
}: {
  user: SessionUser;
  windowDays: number;
  hasLeaveFeature: boolean;
  hasOnCallFeature: boolean;
}) {
  const pendingLeavePromise = hasLeaveFeature
    ? safe(
        (prisma as PrismaAny).lOARequest.count({
          where: { tenantId: user.tenantId, status: "PENDING" },
        }),
        0 as number
      )
    : Promise.resolve(0);

  const openOnCallPromise = hasOnCallFeature
    ? safe(
        (prisma as PrismaAny).onCallRequest.count({
          where: { tenantId: user.tenantId, status: "OPEN" },
        }),
        0 as number
      )
    : Promise.resolve(0);

  const [cpdRows, teacherRows, cohortResult, studentResult, pendingLeaveCount, openOnCallCount] = await Promise.all([
    safe(computeCpdPriorities(user.tenantId, windowDays), [] as CpdPriorityRow[]),
    safe(computeTeacherRiskIndex(user.tenantId, windowDays), [] as TeacherRiskRow[]),
    safe(computeCohortPivot(user.tenantId, windowDays), { rows: [] as CohortPivotRow[], computedAt: new Date() }),
    safe(computeStudentRiskIndex(user.tenantId, windowDays, user.id), { rows: [] as StudentRiskRow[], computedAt: new Date() }),
    pendingLeavePromise,
    openOnCallPromise,
  ]);

  return {
    cpdRows,
    teacherRows,
    cohortRows: cohortResult.rows,
    studentRows: studentResult.rows,
    topImproving: getTopImprovingSignals(cpdRows),
    pendingLeaveCount: pendingLeaveCount as number,
    openOnCallCount: openOnCallCount as number,
  };
}

export async function hydrateHodHomeData({
  user,
  windowDays,
  searchDeptId,
}: {
  user: SessionUser;
  windowDays: number;
  searchDeptId?: string | null;
}) {
  const hodMemberships = await safe(
    (prisma as PrismaAny).departmentMembership.findMany({
      where: { userId: user.id, isHeadOfDepartment: true },
      include: { department: true },
    }),
    [] as any[]
  );

  const allDepts: { id: string; name: string }[] = (hodMemberships as any[]).map((m: any) => ({
    id: m.departmentId as string,
    name: m.department.name as string,
  }));

  const activeDeptId: string | null =
    searchDeptId && allDepts.find((d) => d.id === searchDeptId) ? searchDeptId : allDepts[0]?.id ?? null;

  if (!activeDeptId) {
    return {
      allDepts,
      activeDeptId: null,
      deptName: "",
      deptCpdRows: [] as CpdPriorityRow[],
      filteredTeacherRows: [] as TeacherRiskRow[],
      selfProfile: null,
      wholeSchoolTop1: null as CpdPriorityRow | null,
    };
  }

  const deptName = allDepts.find((d) => d.id === activeDeptId)?.name ?? "";

  const [deptCpdRows, deptTeacherRows, selfProfile, wholeSchoolCpd, deptMemberships] = await Promise.all([
    safe(computeCpdPriorities(user.tenantId, windowDays, { departmentId: activeDeptId }), [] as CpdPriorityRow[]),
    safe(computeTeacherRiskIndex(user.tenantId, windowDays), [] as TeacherRiskRow[]),
    safe(computeTeacherSignalProfile(user.tenantId, user.id, windowDays), null),
    safe(computeCpdPriorities(user.tenantId, windowDays), [] as CpdPriorityRow[]),
    safe(
      (prisma as PrismaAny).departmentMembership.findMany({
        where: { tenantId: user.tenantId, departmentId: activeDeptId },
      }),
      [] as any[]
    ),
  ]);

  const deptUserIds = new Set<string>((deptMemberships as any[]).map((m: any) => m.userId as string));
  const filteredTeacherRows = (deptTeacherRows as TeacherRiskRow[]).filter((r) =>
    deptUserIds.has(r.teacherMembershipId)
  );
  const wholeSchoolTop1 = wholeSchoolCpd.find((r) => r.teachersDriftingDown > 0) ?? null;

  return {
    allDepts,
    activeDeptId,
    deptName,
    deptCpdRows,
    filteredTeacherRows,
    selfProfile,
    wholeSchoolTop1,
  };
}

export async function hydrateTeacherHomeData({
  user,
  windowDays,
  hasAnalysisFeature,
  assembly,
}: {
  user: SessionUser;
  windowDays: number;
  hasAnalysisFeature: boolean;
  assembly: HomeAssembly;
}) {
  const selfProfilePromise =
    hasAnalysisFeature && assembly.has("observe.my-observation-profile")
      ? safe(computeTeacherSignalProfile(user.tenantId, user.id, windowDays), null)
      : Promise.resolve(null);

  const wholeSchoolCpdPromise =
    hasAnalysisFeature && assembly.has("observe.whole-school-focus")
      ? safe(computeCpdPriorities(user.tenantId, windowDays), [] as CpdPriorityRow[])
      : Promise.resolve([] as CpdPriorityRow[]);

  const loaDataPromise = assembly.has("operations.my-leave-status")
    ? safe(
        (prisma as PrismaAny).lOARequest.findFirst({
          where: { tenantId: user.tenantId, requesterId: user.id },
          orderBy: { createdAt: "desc" },
        }),
        null
      )
    : Promise.resolve(null);

  const onCallDataPromise = assembly.has("culture.my-oncall-status")
    ? safe(
        (prisma as PrismaAny).onCallRequest.findMany({
          where: { tenantId: user.tenantId, requesterUserId: user.id },
          orderBy: { createdAt: "desc" },
          take: 3,
        }),
        [] as any[]
      )
    : Promise.resolve([] as any[]);

  const openActionsDataPromise = assembly.has("operations.my-open-actions")
    ? safe(
        (prisma as PrismaAny).meetingAction.findMany({
          where: { tenantId: user.tenantId, ownerUserId: user.id, status: "OPEN" },
          orderBy: [{ dueDate: "asc" }],
          take: 5,
        }),
        [] as any[]
      )
    : Promise.resolve([] as any[]);

  const [selfProfile, wholeSchoolCpd, loaData, onCallData, openActionsData] = await Promise.all([
    selfProfilePromise,
    wholeSchoolCpdPromise,
    loaDataPromise,
    onCallDataPromise,
    openActionsDataPromise,
  ]);

  const wholeSchoolTop1 = (wholeSchoolCpd as CpdPriorityRow[]).find((r) => r.teachersDriftingDown > 0) ?? null;

  return {
    selfProfile,
    wholeSchoolTop1,
    loaData,
    onCallData,
    openActionsData,
  };
}
