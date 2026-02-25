import { parse } from "csv-parse/sync";

export const REQUIRED_FIELDS = [
  "UPN",
  "Name",
  "YearGroup",
  "PositivePointsTotal",
  "Detentions",
  "InternalExclusions",
  "Suspensions",
  "Attendance",
  "Lateness",
  "OnCalls",
  "SEND",
  "PP",
  "Status"
] as const;

export type StudentCsvRecord = {
  upn: string;
  fullName: string;
  yearGroup: string;
  positivePointsTotal: number;
  detentionsCount: number;
  internalExclusionsCount: number;
  suspensionsCount: number;
  onCallsCount: number;
  attendancePct: number;
  latenessCount: number;
  sendFlag: boolean;
  ppFlag: boolean;
  status: "ACTIVE" | "ARCHIVED";
};

export function parseBoolean(raw: string) {
  const v = String(raw || "").trim().toLowerCase();
  return ["1", "true", "yes", "y"].includes(v);
}

export function parseStatus(raw: string): "ACTIVE" | "ARCHIVED" {
  const v = String(raw || "").trim().toLowerCase();
  return ["archive", "archived", "inactive"].includes(v) ? "ARCHIVED" : "ACTIVE";
}

export function parseAttendancePct(raw: string): number {
  const value = String(raw || "").trim().replace("%", "");
  if (!value) return 0;
  const n = Number(value);
  if (Number.isNaN(n)) return 0;
  if (n <= 1) return Number((n * 100).toFixed(2));
  return Number(n.toFixed(2));
}

export function parseStudentsCsv(input: string, mapping: Record<string, string>) {
  const rows = parse(input, { columns: true, skip_empty_lines: true, trim: true }) as Record<string, string>[];
  const parsed: StudentCsvRecord[] = [];
  const errors: Array<{ rowNumber: number; field: string; message: string }> = [];

  rows.forEach((row, idx) => {
    const get = (requiredField: string) => row[mapping[requiredField] || requiredField] || "";

    const upn = get("UPN").trim();
    const fullName = get("Name").trim();
    if (!upn) errors.push({ rowNumber: idx + 1, field: "UPN", message: "UPN is required" });
    if (!fullName) errors.push({ rowNumber: idx + 1, field: "Name", message: "Name is required" });

    parsed.push({
      upn,
      fullName,
      yearGroup: get("YearGroup").trim(),
      positivePointsTotal: Number(get("PositivePointsTotal") || 0),
      detentionsCount: Number(get("Detentions") || 0),
      internalExclusionsCount: Number(get("InternalExclusions") || 0),
      suspensionsCount: Number(get("Suspensions") || 0),
      onCallsCount: Number(get("OnCalls") || 0),
      attendancePct: parseAttendancePct(get("Attendance")),
      latenessCount: Number(get("Lateness") || 0),
      sendFlag: parseBoolean(get("SEND")),
      ppFlag: parseBoolean(get("PP")),
      status: parseStatus(get("Status"))
    });
  });

  return { parsed, errors, preview: parsed.slice(0, 20) };
}

export function parseSubjectTeacherCsv(input: string) {
  return parse(input, { columns: true, skip_empty_lines: true, trim: true }) as Array<{
    UPN: string;
    Subject: string;
    TeacherEmail: string;
    EffectiveFrom: string;
    EffectiveTo?: string;
  }>;
}

export const parseStudentCsv = (input: string) => parseStudentsCsv(input, Object.fromEntries(REQUIRED_FIELDS.map((f) => [f, f])) as Record<string,string>).parsed.map((r) => ({externalId:r.upn, firstName:r.fullName.split(" ")[0] || r.fullName, lastName:r.fullName.split(" ").slice(1).join(" "), positivePoints:r.positivePointsTotal, detentions:r.detentionsCount, internalExclusions:r.internalExclusionsCount, onCalls:r.onCallsCount, suspensions:r.suspensionsCount, attendancePercent:r.attendancePct}));
