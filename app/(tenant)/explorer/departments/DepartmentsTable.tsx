"use client";

import { useState } from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type DepartmentRow = {
  departmentId: string;
  departmentName: string;
  faculty: string | null;
  teacherCount: number;
  observationCount: number;
  signalDots: { key: string; label: string; color: "green" | "amber" | "red" | "gray" }[];
  status: "STABLE" | "WARNING" | "DRIFTING" | "CRITICAL DRIFT";
};

type Props = {
  rows: DepartmentRow[];
  pageSize?: number;
};

/* ------------------------------------------------------------------ */
/*  Status badge                                                       */
/* ------------------------------------------------------------------ */

const STATUS_STYLES: Record<string, string> = {
  STABLE:
    "border-emerald-300 bg-emerald-50 text-emerald-700",
  WARNING:
    "border-amber-300 bg-amber-50 text-amber-700",
  DRIFTING:
    "border-rose-300 bg-rose-50 text-rose-700",
  "CRITICAL DRIFT":
    "border-slate-800 bg-slate-900 text-white",
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function DepartmentsTable({ rows, pageSize = 5 }: Props) {
  const [page, setPage] = useState(0);
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const visible = rows.slice(page * pageSize, page * pageSize + pageSize);

  return (
    <>
      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-white/60 bg-white/60 backdrop-blur-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/30 bg-white/40 text-left text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-muted">
                <th className="px-5 py-3.5">Department Name</th>
                <th className="px-4 py-3.5 text-center">Teachers</th>
                <th className="px-4 py-3.5 text-center">Obs</th>
                <th className="px-4 py-3.5">Signal Heatmap</th>
                <th className="px-4 py-3.5 text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => (
                <tr
                  key={row.departmentId}
                  className="group border-b border-border/20 last:border-0 calm-transition hover:bg-white/50"
                >
                  {/* Department name + faculty */}
                  <td className="px-5 py-4">
                    <span className="block font-semibold text-text">{row.departmentName}</span>
                    {row.faculty && (
                      <span className="mt-0.5 block text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-muted">
                        {row.faculty}
                      </span>
                    )}
                  </td>

                  {/* Teacher count */}
                  <td className="px-4 py-4 text-center tabular-nums font-semibold text-text">
                    {row.teacherCount}
                  </td>

                  {/* Observation count */}
                  <td className="px-4 py-4 text-center tabular-nums font-semibold text-text">
                    {row.observationCount}
                  </td>

                  {/* Signal heatmap dots */}
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-1.5">
                      {row.signalDots.map((dot) => (
                        <span
                          key={dot.key}
                          className={`inline-block h-3.5 w-3.5 rounded-full ${
                            dot.color === "green"
                              ? "bg-emerald-500"
                              : dot.color === "amber"
                                ? "bg-amber-400"
                                : dot.color === "red"
                                  ? "bg-rose-500"
                                  : "bg-gray-300"
                          }`}
                          title={dot.label}
                        />
                      ))}
                    </div>
                  </td>

                  {/* Status badge */}
                  <td className="px-4 py-4 text-right">
                    <span
                      className={`inline-flex items-center rounded-full border px-3 py-1 text-[0.6875rem] font-semibold ${STATUS_STYLES[row.status] ?? STATUS_STYLES.STABLE}`}
                    >
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination footer */}
        <div className="flex items-center justify-between border-t border-border/30 px-5 py-3">
          <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-muted">
            Showing {visible.length} of {rows.length} departments
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-border text-muted calm-transition hover:text-text disabled:opacity-30"
              aria-label="Previous page"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-border text-muted calm-transition hover:text-text disabled:opacity-30"
              aria-label="Next page"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
