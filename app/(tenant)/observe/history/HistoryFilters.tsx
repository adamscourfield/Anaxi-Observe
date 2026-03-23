"use client";

import Link from "next/link";
import { FormSelect } from "@/components/ui/form-select";

interface HistoryFiltersProps {
  teachers: { id: string; fullName: string }[];
  observers: { id: string; fullName: string }[];
  subjects: string[];
  defaults: {
    teacherId: string;
    observerId: string;
    subject: string;
    from: string;
    to: string;
  };
  showTeacherFilters: boolean;
  hasFilters: boolean;
}

export function HistoryFilters({
  teachers,
  observers,
  subjects,
  defaults,
  showTeacherFilters,
  hasFilters,
}: HistoryFiltersProps) {
  return (
    <div className="filter-bar">
      <form className="flex flex-wrap items-end gap-4 w-full">
        {showTeacherFilters && (
          <>
            <label className="flex flex-col gap-1.5 min-w-[140px]">
              <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-muted">Teacher</span>
              <FormSelect
                name="teacherId"
                defaultValue={defaults.teacherId}
                placeholder="All Teachers"
                searchable
                options={[
                  { value: "", label: "All Teachers" },
                  ...teachers.map((t) => ({ value: t.id, label: t.fullName })),
                ]}
              />
            </label>
            <label className="flex flex-col gap-1.5 min-w-[140px]">
              <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-muted">Observer</span>
              <FormSelect
                name="observerId"
                defaultValue={defaults.observerId}
                placeholder="All Observers"
                searchable
                options={[
                  { value: "", label: "All Observers" },
                  ...observers.map((o) => ({ value: o.id, label: o.fullName })),
                ]}
              />
            </label>
          </>
        )}
        <label className="flex flex-col gap-1.5 min-w-[140px]">
          <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-muted">Subject / Year</span>
          <FormSelect
            name="subject"
            defaultValue={defaults.subject}
            placeholder="All Curricula"
            options={[
              { value: "", label: "All Curricula" },
              ...subjects.map((s) => ({ value: s, label: s })),
            ]}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-muted">From Date</span>
          <input name="from" type="date" defaultValue={defaults.from} className="field" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-muted">To Date</span>
          <input name="to" type="date" defaultValue={defaults.to} className="field" />
        </label>
        <div className="flex items-end gap-2 ml-auto">
          <button
            type="submit"
            className="rounded-lg bg-primary px-5 py-2 text-[0.8125rem] font-semibold text-on-primary calm-transition hover:opacity-90"
          >
            Apply Filters
          </button>
          {hasFilters && (
            <Link
              href="/observe/history"
              className="rounded-lg border border-border/40 bg-surface-container-lowest px-4 py-2 text-[0.8125rem] font-medium text-muted calm-transition hover:bg-surface-container-low hover:text-text"
            >
              Clear
            </Link>
          )}
        </div>
      </form>
    </div>
  );
}
