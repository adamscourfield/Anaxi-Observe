import { describe, it, expect } from "vitest";
import {
  canViewExplorer,
  canExportExplorer,
  canViewBehaviourExplorer,
  getExplorerTeacherScope,
} from "../index";
import type { ViewerContext } from "../index";

const makeViewer = (role: string, overrides: Partial<ViewerContext> = {}): ViewerContext => ({
  userId: "user1",
  role: role as any,
  hodDepartmentIds: [],
  coacheeUserIds: [],
  ...overrides,
});

describe("canViewExplorer", () => {
  it("allows ADMIN", () => expect(canViewExplorer(makeViewer("ADMIN"))).toBe(true));
  it("allows SLT", () => expect(canViewExplorer(makeViewer("SLT"))).toBe(true));
  it("allows HOD", () => expect(canViewExplorer(makeViewer("HOD"))).toBe(true));
  it("blocks TEACHER", () => expect(canViewExplorer(makeViewer("TEACHER"))).toBe(false));
  it("blocks LEADER", () => expect(canViewExplorer(makeViewer("LEADER"))).toBe(false));
});

describe("canExportExplorer", () => {
  it("allows ADMIN", () => expect(canExportExplorer(makeViewer("ADMIN"))).toBe(true));
  it("allows SLT", () => expect(canExportExplorer(makeViewer("SLT"))).toBe(true));
  it("allows HOD", () => expect(canExportExplorer(makeViewer("HOD"))).toBe(true));
  it("blocks TEACHER", () => expect(canExportExplorer(makeViewer("TEACHER"))).toBe(false));
  it("blocks LEADER without coachees", () => expect(canExportExplorer(makeViewer("LEADER"))).toBe(false));
});

describe("canViewBehaviourExplorer", () => {
  it("allows ADMIN", () => expect(canViewBehaviourExplorer(makeViewer("ADMIN"))).toBe(true));
  it("allows SLT", () => expect(canViewBehaviourExplorer(makeViewer("SLT"))).toBe(true));
  it("allows HOD", () => expect(canViewBehaviourExplorer(makeViewer("HOD"))).toBe(true));
  it("blocks TEACHER", () => expect(canViewBehaviourExplorer(makeViewer("TEACHER"))).toBe(false));
});

describe("getExplorerTeacherScope", () => {
  it("returns undefined for ADMIN (no restriction)", () => {
    expect(getExplorerTeacherScope(makeViewer("ADMIN"))).toBeUndefined();
  });
  it("returns undefined for SLT (no restriction)", () => {
    expect(getExplorerTeacherScope(makeViewer("SLT"))).toBeUndefined();
  });
  it("returns undefined for HOD (dept filter applied separately)", () => {
    expect(getExplorerTeacherScope(makeViewer("HOD", { hodDepartmentIds: ["d1"] }))).toBeUndefined();
  });
  it("returns coachee IDs for LEADER with coachees", () => {
    const scope = getExplorerTeacherScope(makeViewer("LEADER", { coacheeUserIds: ["t1", "t2"] }));
    expect(scope).toEqual(["t1", "t2"]);
  });
  it("returns own ID for TEACHER", () => {
    const scope = getExplorerTeacherScope(makeViewer("TEACHER", { userId: "me" }));
    expect(scope).toEqual(["me"]);
  });
});
