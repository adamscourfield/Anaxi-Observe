import { describe, expect, it } from "vitest";
import {
  parseStaffRole,
  parseIsHOD,
  parseDepartments,
  parseMembershipStatus,
  parseStaffCsv,
  generateStaffCSVTemplate,
  STAFF_TEMPLATE_COLUMNS,
} from "@/modules/staff-import/csv";

describe("parseStaffRole", () => {
  it("parses valid roles (case-insensitive)", () => {
    expect(parseStaffRole("TEACHER")).toBe("TEACHER");
    expect(parseStaffRole("Admin")).toBe("ADMIN");
    expect(parseStaffRole("slt")).toBe("SLT");
    expect(parseStaffRole("HOD")).toBe("HOD");
    expect(parseStaffRole("hr")).toBe("HR");
    expect(parseStaffRole("on_call")).toBe("ON_CALL");
  });

  it("returns null for invalid roles", () => {
    expect(parseStaffRole("MANAGER")).toBeNull();
    expect(parseStaffRole("")).toBeNull();
    expect(parseStaffRole("LEADER")).toBeNull();
  });
});

describe("parseIsHOD", () => {
  it("parses truthy values", () => {
    expect(parseIsHOD("yes")).toBe(true);
    expect(parseIsHOD("Yes")).toBe(true);
    expect(parseIsHOD("y")).toBe(true);
    expect(parseIsHOD("1")).toBe(true);
    expect(parseIsHOD("true")).toBe(true);
  });

  it("parses falsy values", () => {
    expect(parseIsHOD("no")).toBe(false);
    expect(parseIsHOD("No")).toBe(false);
    expect(parseIsHOD("n")).toBe(false);
    expect(parseIsHOD("0")).toBe(false);
    expect(parseIsHOD("false")).toBe(false);
    expect(parseIsHOD("")).toBe(false);
  });
});

describe("parseDepartments", () => {
  it("splits on semicolons and trims", () => {
    expect(parseDepartments("Maths;Science;English")).toEqual(["Maths", "Science", "English"]);
    expect(parseDepartments(" Maths ; Science ")).toEqual(["Maths", "Science"]);
  });

  it("returns empty array for empty/blank input", () => {
    expect(parseDepartments("")).toEqual([]);
    expect(parseDepartments("  ")).toEqual([]);
  });

  it("handles single department", () => {
    expect(parseDepartments("English")).toEqual(["English"]);
  });
});

describe("parseMembershipStatus", () => {
  it("returns ACTIVE for ACTIVE or empty", () => {
    expect(parseMembershipStatus("ACTIVE")).toBe("ACTIVE");
    expect(parseMembershipStatus("active")).toBe("ACTIVE");
    expect(parseMembershipStatus("")).toBe("ACTIVE");
  });

  it("returns ARCHIVED for ARCHIVED", () => {
    expect(parseMembershipStatus("ARCHIVED")).toBe("ARCHIVED");
    expect(parseMembershipStatus("archived")).toBe("ARCHIVED");
  });

  it("returns null for invalid values", () => {
    expect(parseMembershipStatus("INACTIVE")).toBeNull();
    expect(parseMembershipStatus("DELETED")).toBeNull();
  });
});

describe("generateStaffCSVTemplate", () => {
  it("has the correct headers", () => {
    const template = generateStaffCSVTemplate();
    const lines = template.split("\n");
    const headers = lines[0].split(",");
    for (const col of STAFF_TEMPLATE_COLUMNS) {
      expect(headers).toContain(col);
    }
  });

  it("includes example rows", () => {
    const lines = generateStaffCSVTemplate().split("\n");
    expect(lines.length).toBeGreaterThanOrEqual(3);
  });
});

describe("parseStaffCsv", () => {
  const validCsv = [
    "Email,FullName,Role,Departments,IsHOD,HODDepartments,CoachEmail,MembershipStatus",
    "alice@school.example,Alice Smith,TEACHER,Maths;Science,no,,bob@school.example,ACTIVE",
    "bob@school.example,Bob Jones,HOD,English,yes,English,,ACTIVE",
  ].join("\n");

  it("parses valid rows correctly", () => {
    const { parsed, errors } = parseStaffCsv(validCsv);
    expect(errors.filter((e) => e.errorCode !== "MISSING_FULL_NAME")).toHaveLength(0);
    expect(parsed).toHaveLength(2);
    expect(parsed[0].email).toBe("alice@school.example");
    expect(parsed[0].departments).toEqual(["Maths", "Science"]);
    expect(parsed[0].coachEmail).toBe("bob@school.example");
    expect(parsed[0].membershipStatus).toBe("ACTIVE");
    expect(parsed[1].hodDepartments).toEqual(["English"]);
    expect(parsed[1].isHOD).toBe(true);
  });

  it("lowercases and trims emails", () => {
    const csv = [
      "Email,FullName,Role,Departments,IsHOD,HODDepartments,CoachEmail,MembershipStatus",
      "  Alice@School.EXAMPLE  ,Alice,TEACHER,,,,,ACTIVE",
    ].join("\n");
    const { parsed } = parseStaffCsv(csv);
    expect(parsed[0].email).toBe("alice@school.example");
  });

  it("errors on missing Email", () => {
    const csv = [
      "Email,FullName,Role,Departments,IsHOD,HODDepartments,CoachEmail,MembershipStatus",
      ",Alice Smith,TEACHER,,,,,ACTIVE",
    ].join("\n");
    const { errors } = parseStaffCsv(csv);
    expect(errors.some((e) => e.errorCode === "MISSING_EMAIL")).toBe(true);
  });

  it("errors on invalid email format", () => {
    const csv = [
      "Email,FullName,Role,Departments,IsHOD,HODDepartments,CoachEmail,MembershipStatus",
      "not-an-email,Alice Smith,TEACHER,,,,,ACTIVE",
    ].join("\n");
    const { errors } = parseStaffCsv(csv);
    expect(errors.some((e) => e.errorCode === "INVALID_EMAIL")).toBe(true);
  });

  it("errors on invalid Role", () => {
    const csv = [
      "Email,FullName,Role,Departments,IsHOD,HODDepartments,CoachEmail,MembershipStatus",
      "alice@school.example,Alice,MANAGER,,,,,ACTIVE",
    ].join("\n");
    const { errors } = parseStaffCsv(csv);
    expect(errors.some((e) => e.errorCode === "INVALID_ROLE")).toBe(true);
  });

  it("errors on invalid MembershipStatus", () => {
    const csv = [
      "Email,FullName,Role,Departments,IsHOD,HODDepartments,CoachEmail,MembershipStatus",
      "alice@school.example,Alice,TEACHER,,,,,DELETED",
    ].join("\n");
    const { errors } = parseStaffCsv(csv);
    expect(errors.some((e) => e.errorCode === "INVALID_MEMBERSHIP_STATUS")).toBe(true);
  });

  it("unions HODDepartments into Departments", () => {
    const csv = [
      "Email,FullName,Role,Departments,IsHOD,HODDepartments,CoachEmail,MembershipStatus",
      "alice@school.example,Alice,HOD,Maths,yes,Science,,ACTIVE",
    ].join("\n");
    const { parsed } = parseStaffCsv(csv);
    expect(parsed[0].departments).toContain("Maths");
    expect(parsed[0].departments).toContain("Science");
  });

  it("preview returns at most 10 rows", () => {
    const header = "Email,FullName,Role,Departments,IsHOD,HODDepartments,CoachEmail,MembershipStatus";
    const dataRows = Array.from({ length: 15 }, (_, i) =>
      `user${i}@school.example,User ${i},TEACHER,,,,,ACTIVE`
    );
    const csv = [header, ...dataRows].join("\n");
    const { preview } = parseStaffCsv(csv);
    expect(preview.length).toBeLessThanOrEqual(10);
  });
});
