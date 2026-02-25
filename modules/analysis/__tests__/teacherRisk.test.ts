import { describe, it, expect } from "vitest";
import {
  canViewTeacherAnalysis,
  type ViewerContext,
  type TeacherAnalysisTarget,
} from "@/modules/authz/index";

// ─── canViewTeacherAnalysis ───────────────────────────────────────────────────

describe("canViewTeacherAnalysis", () => {
  const target: TeacherAnalysisTarget = {
    teacherUserId: "teacher-1",
    teacherDepartmentIds: ["dept-maths"],
  };

  it("ADMIN can view any teacher", () => {
    const viewer: ViewerContext = {
      userId: "admin-1",
      role: "ADMIN",
      hodDepartmentIds: [],
      coacheeUserIds: [],
    };
    expect(canViewTeacherAnalysis(viewer, target)).toBe(true);
  });

  it("SLT can view any teacher", () => {
    const viewer: ViewerContext = {
      userId: "slt-1",
      role: "SLT",
      hodDepartmentIds: [],
      coacheeUserIds: [],
    };
    expect(canViewTeacherAnalysis(viewer, target)).toBe(true);
  });

  it("Teacher can view their own profile", () => {
    const viewer: ViewerContext = {
      userId: "teacher-1",
      role: "TEACHER",
      hodDepartmentIds: [],
      coacheeUserIds: [],
    };
    expect(canViewTeacherAnalysis(viewer, target)).toBe(true);
  });

  it("Teacher cannot view another teacher's profile", () => {
    const viewer: ViewerContext = {
      userId: "teacher-2",
      role: "TEACHER",
      hodDepartmentIds: [],
      coacheeUserIds: [],
    };
    expect(canViewTeacherAnalysis(viewer, target)).toBe(false);
  });

  it("HOD can view teachers in their department", () => {
    const viewer: ViewerContext = {
      userId: "hod-1",
      role: "HOD",
      hodDepartmentIds: ["dept-maths"],
      coacheeUserIds: [],
    };
    expect(canViewTeacherAnalysis(viewer, target)).toBe(true);
  });

  it("HOD cannot view teachers outside their department", () => {
    const viewer: ViewerContext = {
      userId: "hod-2",
      role: "HOD",
      hodDepartmentIds: ["dept-english"],
      coacheeUserIds: [],
    };
    expect(canViewTeacherAnalysis(viewer, target)).toBe(false);
  });

  it("Coach can view their assigned coachee", () => {
    const viewer: ViewerContext = {
      userId: "coach-1",
      role: "LEADER",
      hodDepartmentIds: [],
      coacheeUserIds: ["teacher-1"],
    };
    expect(canViewTeacherAnalysis(viewer, target)).toBe(true);
  });

  it("Coach cannot view non-coachees", () => {
    const viewer: ViewerContext = {
      userId: "coach-1",
      role: "LEADER",
      hodDepartmentIds: [],
      coacheeUserIds: ["teacher-99"],
    };
    expect(canViewTeacherAnalysis(viewer, target)).toBe(false);
  });
});
