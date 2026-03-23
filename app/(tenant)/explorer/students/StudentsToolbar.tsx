"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useRef } from "react";

type Props = {
  yearGroups: string[];
  defaultSearch: string;
  defaultYearGroup: string;
  defaultBand: string;
  defaultWindow: string;
  totalFiltered: number;
  pageStart: number;
  pageEnd: number;
};

const BANDS = [
  { value: "URGENT", label: "Urgent" },
  { value: "PRIORITY", label: "Priority" },
  { value: "WATCH", label: "Watch" },
  { value: "STABLE", label: "Stable" },
];

const WINDOWS = ["7", "21", "28"];

export function StudentsToolbar({
  yearGroups,
  defaultSearch,
  defaultYearGroup,
  defaultBand,
  defaultWindow,
  totalFiltered,
  pageStart,
  pageEnd,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showFilters, setShowFilters] = useState(
    !!(defaultYearGroup || defaultBand),
  );
  const [search, setSearch] = useState(defaultSearch);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function navigate(overrides: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(overrides)) {
      if (value === null || value === "") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }
    params.delete("page");
    const qs = params.toString();
    router.push(`/explorer/students${qs ? `?${qs}` : ""}`);
  }

  function handleSearchChange(value: string) {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      navigate({ studentSearch: value || null });
    }, 400);
  }

  return (
    <div className="space-y-3">
      {/* Main filter bar */}
      <div className="filter-bar">
        {/* Search input */}
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m17 17 4 4" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            placeholder="Search students..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="field min-w-[240px] !rounded-lg !py-1.5 pl-10 pr-4"
          />
        </div>

        {/* Window period toggle */}
        <div className="filter-period-toggle">
          {WINDOWS.map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => navigate({ windowDays: w })}
              className={`filter-period-btn ${w === defaultWindow ? "filter-period-btn-active" : ""}`}
            >
              {w}D
            </button>
          ))}
        </div>

        {/* Year group */}
        <select
          defaultValue={defaultYearGroup}
          onChange={(e) => navigate({ yearGroup: e.target.value || null })}
          className="field min-w-[130px] !rounded-lg !py-1.5 !text-[0.8125rem]"
        >
          <option value="">All Year Groups</option>
          {yearGroups.map((yg) => (
            <option key={yg} value={yg}>
              {yg}
            </option>
          ))}
        </select>

        {/* Risk band */}
        <select
          defaultValue={defaultBand}
          onChange={(e) => navigate({ band: e.target.value || null })}
          className="field min-w-[130px] !rounded-lg !py-1.5 !text-[0.8125rem]"
        >
          <option value="">All Risk Bands</option>
          {BANDS.map((b) => (
            <option key={b.value} value={b.value}>
              {b.label}
            </option>
          ))}
        </select>

        {/* More Filters toggle */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`inline-flex items-center gap-1.5 rounded-lg border px-4 py-1.5 text-[0.8125rem] font-medium calm-transition ${
            showFilters
              ? "border-accent/20 bg-accent/5 text-accent"
              : "border-border/40 bg-surface-container-lowest text-muted hover:bg-surface-container-low hover:text-text"
          }`}
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" />
          </svg>
          More Filters
        </button>

        <p className="ml-auto text-[0.8125rem] text-muted">
          Showing{" "}
          <span className="font-semibold text-text">{pageStart}–{pageEnd}</span>
          {" "}of{" "}
          <span className="font-semibold text-text">{totalFiltered.toLocaleString()}</span>
          {" "}students
        </p>
      </div>

      {/* Expanded filter panel (additional) */}
      {showFilters && (
        <div className="filter-bar">
          {(defaultYearGroup || defaultBand || defaultSearch) && (
            <button
              onClick={() => {
                setSearch("");
                navigate({ yearGroup: null, band: null, studentSearch: null });
              }}
              className="rounded-lg border border-border/40 bg-surface-container-lowest px-3 py-1.5 text-[0.8125rem] font-medium text-muted calm-transition hover:bg-surface-container-low hover:text-text"
            >
              Clear all filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}
