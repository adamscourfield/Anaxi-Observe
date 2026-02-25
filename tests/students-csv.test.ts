import { describe, expect, it } from "vitest";
import { parseAttendancePct, parseStudentsCsv } from "@/modules/students/csv";

describe("students csv", () => {
  it("parses attendance variants", () => {
    expect(parseAttendancePct("96.5")).toBe(96.5);
    expect(parseAttendancePct("96.5%")).toBe(96.5);
    expect(parseAttendancePct("0.965")).toBe(96.5);
  });

  it("parses rows with mapping", () => {
    const csv = `UPN,Name,YearGroup,PositivePointsTotal,Detentions,InternalExclusions,Suspensions,Attendance,Lateness,OnCalls,SEND,PP,Status\nU1,Ada Lovelace,Y10,10,2,0,0,96.5,1,2,Yes,No,Active`;
    const mapping = {
      UPN: "UPN", Name: "Name", YearGroup: "YearGroup", PositivePointsTotal: "PositivePointsTotal", Detentions: "Detentions", InternalExclusions: "InternalExclusions", Suspensions: "Suspensions", Attendance: "Attendance", Lateness: "Lateness", OnCalls: "OnCalls", SEND: "SEND", PP: "PP", Status: "Status"
    };
    const result = parseStudentsCsv(csv, mapping);
    expect(result.errors).toHaveLength(0);
    expect(result.parsed[0].upn).toBe("U1");
    expect(result.parsed[0].sendFlag).toBe(true);
  });
});
