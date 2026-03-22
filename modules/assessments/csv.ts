/**
 * Assessment CSV Parser
 *
 * Parses assessment result CSV files into typed records.
 *
 * Two supported CSV layouts:
 *
 * 1. Wide format (one row per student, one grade column per subject):
 *    UPN | Name | Maths | English | Science | ...
 *
 * 2. Long format (one row per result):
 *    UPN | Name | Subject | Grade
 *
 * The parser auto-detects the layout. The column mapping (stored in
 * TenantImportMapping) maps canonical field names to actual CSV headers.
 */

import { parse } from "csv-parse/sync";
import { validateGrade, detectNonGradeStatus } from "./gradeNormalizer";
import type { GradeFormat } from "@prisma/client";

// ─── Types ────────────────────────────────────────────────────────────────────

export type AssessmentCsvRecord = {
  upn: string;
  studentName: string;
  subject: string;
  rawValue: string;
};

export type AssessmentCsvError = {
  rowNumber: number;
  field: string;
  message: string;
};

export type AssessmentCsvResult = {
  records: AssessmentCsvRecord[];
  errors: AssessmentCsvError[];
  preview: AssessmentCsvRecord[];
  /** Detected layout: 'wide' or 'long' */
  layout: "wide" | "long";
};

// ─── Layout detection ─────────────────────────────────────────────────────────

/**
 * Detect whether the CSV is wide (grade per column) or long (one row per result).
 * We look for a "Subject" or "subject" column to identify long format.
 */
function detectLayout(headers: string[]): "wide" | "long" {
  const lower = headers.map((h) => h.toLowerCase());
  if (lower.includes("subject")) return "long";
  return "wide";
}

// ─── Canonical field resolution ───────────────────────────────────────────────

function resolveField(
  row: Record<string, string>,
  mapping: Record<string, string>,
  canonical: string
): string {
  const mapped = mapping[canonical];
  if (mapped && row[mapped] !== undefined) return row[mapped];
  if (row[canonical] !== undefined) return row[canonical];
  return "";
}

// ─── Wide format parser ───────────────────────────────────────────────────────

/**
 * Wide format: UPN | Name | [Subject1] | [Subject2] | ...
 * The mapping tells us which columns are UPN and Name.
 * All remaining columns are treated as subject grade columns.
 */
function parseWide(
  rows: Record<string, string>[],
  headers: string[],
  mapping: Record<string, string>,
  gradeFormat: GradeFormat,
  maxScore?: number | null,
  subjectFilter?: string[]
): AssessmentCsvResult {
  const records: AssessmentCsvRecord[] = [];
  const errors: AssessmentCsvError[] = [];

  const upnCol = mapping["UPN"] || "UPN";
  const nameCol = mapping["Name"] || "Name";
  const metaCols = new Set([upnCol.toLowerCase(), nameCol.toLowerCase()]);

  // Subject columns = everything that isn't UPN or Name
  const subjectCols = headers.filter((h) => !metaCols.has(h.toLowerCase()));

  rows.forEach((row, idx) => {
    const rowNum = idx + 2; // 1-indexed, +1 for header
    const upn = (row[upnCol] || "").trim();
    const studentName = (row[nameCol] || "").trim();

    if (!upn) {
      errors.push({ rowNumber: rowNum, field: "UPN", message: "UPN is required" });
    }

    for (const col of subjectCols) {
      if (subjectFilter && !subjectFilter.includes(col)) continue;
      const rawValue = (row[col] || "").trim();
      if (!rawValue) continue; // blank cell = skip

      // Check for non-grade status markers
      const nonGrade = detectNonGradeStatus(rawValue);
      if (!nonGrade) {
        const validationError = validateGrade(rawValue, gradeFormat, maxScore);
        if (validationError) {
          errors.push({ rowNumber: rowNum, field: col, message: validationError });
          continue;
        }
      }

      records.push({ upn, studentName, subject: col, rawValue });
    }
  });

  return { records, errors, preview: records.slice(0, 20), layout: "wide" };
}

// ─── Long format parser ───────────────────────────────────────────────────────

/**
 * Long format: UPN | Name | Subject | Grade
 */
function parseLong(
  rows: Record<string, string>[],
  mapping: Record<string, string>,
  gradeFormat: GradeFormat,
  maxScore?: number | null,
  subjectFilter?: string[]
): AssessmentCsvResult {
  const records: AssessmentCsvRecord[] = [];
  const errors: AssessmentCsvError[] = [];

  rows.forEach((row, idx) => {
    const rowNum = idx + 2;
    const upn = resolveField(row, mapping, "UPN").trim();
    const studentName = resolveField(row, mapping, "Name").trim();
    const subject = resolveField(row, mapping, "Subject").trim();
    const rawValue = resolveField(row, mapping, "Grade").trim();

    if (!upn) {
      errors.push({ rowNumber: rowNum, field: "UPN", message: "UPN is required" });
      return;
    }
    if (!subject) {
      errors.push({ rowNumber: rowNum, field: "Subject", message: "Subject is required" });
      return;
    }
    if (!rawValue) return; // blank = skip

    if (subjectFilter && !subjectFilter.includes(subject)) return;

    const nonGrade = detectNonGradeStatus(rawValue);
    if (!nonGrade) {
      const validationError = validateGrade(rawValue, gradeFormat, maxScore);
      if (validationError) {
        errors.push({ rowNumber: rowNum, field: "Grade", message: validationError });
        return;
      }
    }

    records.push({ upn, studentName, subject, rawValue });
  });

  return { records, errors, preview: records.slice(0, 20), layout: "long" };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export type ParseAssessmentCsvOptions = {
  /** Column mapping: canonical name → actual CSV header */
  mapping?: Record<string, string>;
  gradeFormat: GradeFormat;
  maxScore?: number | null;
  /** If set, only parse columns/rows for these subjects */
  subjectFilter?: string[];
};

export function parseAssessmentCsv(
  csvContent: string,
  options: ParseAssessmentCsvOptions
): AssessmentCsvResult {
  const { mapping = {}, gradeFormat, maxScore, subjectFilter } = options;

  const rows = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as Record<string, string>[];

  if (rows.length === 0) {
    return { records: [], errors: [], preview: [], layout: "long" };
  }

  const headers = Object.keys(rows[0]);
  const layout = detectLayout(headers);

  if (layout === "wide") {
    return parseWide(rows, headers, mapping, gradeFormat, maxScore, subjectFilter);
  } else {
    return parseLong(rows, mapping, gradeFormat, maxScore, subjectFilter);
  }
}

// ─── Header signature ─────────────────────────────────────────────────────────

/** Produce a stable signature from CSV headers for mapping auto-detection. */
export function computeHeaderSignature(csvContent: string): string {
  const rows = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    to: 1,
    trim: true,
  }) as Record<string, string>[];

  if (rows.length === 0) return "";
  return Object.keys(rows[0]).sort().join(",");
}

// ─── Template helpers ─────────────────────────────────────────────────────────

export const ASSESSMENT_CSV_TEMPLATES = {
  wide: {
    description: "Wide format — one row per student, grade per subject column",
    headers: ["UPN", "Name", "Maths", "English", "Science"],
    example: [
      ["ABC123", "Jane Smith", "7", "6", "8"],
      ["DEF456", "John Doe", "4", "5", "ABS"],
    ],
  },
  long: {
    description: "Long format — one row per student per subject",
    headers: ["UPN", "Name", "Subject", "Grade"],
    example: [
      ["ABC123", "Jane Smith", "Maths", "7"],
      ["ABC123", "Jane Smith", "English", "6"],
      ["DEF456", "John Doe", "Maths", "4"],
    ],
  },
} as const;
