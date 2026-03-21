"use client";

import Link from "next/link";
import { FormSelect } from "@/components/ui/form-select";
import { formatYearGroup } from "@/modules/observations/yearGroup";

interface HistoryFiltersProps {
  teachers: { id: string; fullName: string }[];
  observers: { id: string; fullName: string }[];
  subjects: string[];
  yearGroups: string[];
  defaults: {
    teacherId: string;
    observerId: string;
    subject: string;
    yearGroup: string;
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
  yearGroups,
  defaults,
  showTeacherFilters,
  hasFilters,
}: HistoryFiltersProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/60 bg-white/60 backdrop-blur-sm">
      <div className="border-b border-border/30 px-5 py-3">
        <p className="text-[0.75rem] font-semibold uppercase tracking-[0.08em] text-muted">Filters</p>
      </div>
      <form className="space-y-4 p-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {showTeacherFilters && (
            <>
              <label className="flex flex-col gap-1">
                <span className="text-[0.6875rem] font-medium text-muted">Teacher</span>
                <FormSelect
                  name="teacherId"
                  defaultValue={defaults.teacherId}
                  placeholder="All teachers"
                  searchable
                  options={[
                    { value: "", label: "All teachers" },
                    ...teachers.map((t) => ({ value: t.id, label: t.fullName })),
                  ]}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[0.6875rem] font-medium text-muted">Observer</span>
                <FormSelect
                  name="observerId"
                  defaultValue={defaults.observerId}
                  placeholder="All observers"
                  searchable
                  options={[
                    { value: "", label: "All observers" },
                    ...observers.map((o) => ({ value: o.id, label: o.fullName })),
                  ]}
                />
              </label>
            </>
          )}
          <label className="flex flex-col gap-1">
            <span className="text-[0.6875rem] font-medium text-muted">Subject</span>
            <FormSelect
              name="subject"
              defaultValue={defaults.subject}
              placeholder="All subjects"
              options={[
                { value: "", label: "All subjects" },
                ...subjects.map((s) => ({ value: s, label: s })),
              ]}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[0.6875rem] font-medium text-muted">Year group</span>
            <FormSelect
              name="yearGroup"
              defaultValue={defaults.yearGroup}
              placeholder="All years"
              options={[
                { value: "", label: "All years" },
                ...yearGroups.map((yg) => ({ value: yg, label: formatYearGroup(yg) })),
              ]}
            />
          </label>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-[0.6875rem] font-medium text-muted">From</span>
            <input name="from" type="date" defaultValue={defaults.from} className="field" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[0.6875rem] font-medium text-muted">To</span>
            <input name="to" type="date" defaultValue={defaults.to} className="field" />
          </label>
          <div className="flex gap-2">
            <button
              type="submit"
              className="rounded-lg bg-accent px-4 py-2 text-[0.8125rem] font-semibold text-white calm-transition hover:bg-accentHover"
            >
              Apply
            </button>
            {hasFilters && (
              <Link
                href="/observe/history"
                className="rounded-lg border border-border bg-white/70 px-4 py-2 text-[0.8125rem] font-medium text-muted calm-transition hover:text-text"
              >
                Clear
              </Link>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
