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
      {/* Search + Filter row */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
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
              className="field min-w-[240px] py-2.5 pl-10 pr-4"
            />
          </div>

          {/* Filter toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium calm-transition ${
              showFilters
                ? "border-accent/20 bg-accent/5 text-accent"
                : "border-border/40 bg-white text-text hover:bg-bg"
            }`}
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M3 6h18M7 12h10M10 18h4" strokeLinecap="round" />
            </svg>
            Filter
          </button>
        </div>

        <p className="text-sm text-muted">
          Showing{" "}
          <span className="font-semibold text-text">
            {pageStart}-{pageEnd}
          </span>{" "}
          of{" "}
          <span className="font-semibold text-text">
            {totalFiltered.toLocaleString()}
          </span>{" "}
          students
        </p>
      </div>

      {/* Expanded filter panel */}
      {showFilters && (
        <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border/20 bg-white/60 px-4 py-3 backdrop-blur-sm">
          <label className="flex flex-col gap-1">
            <span className="text-[0.6875rem] font-medium text-muted">
              Window
            </span>
            <select
              defaultValue={defaultWindow}
              onChange={(e) => navigate({ windowDays: e.target.value })}
              className="field min-w-[100px]"
            >
              {WINDOWS.map((w) => (
                <option key={w} value={w}>
                  {w} days
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-[0.6875rem] font-medium text-muted">
              Year group
            </span>
            <select
              defaultValue={defaultYearGroup}
              onChange={(e) => navigate({ yearGroup: e.target.value || null })}
              className="field min-w-[120px]"
            >
              <option value="">All years</option>
              {yearGroups.map((yg) => (
                <option key={yg} value={yg}>
                  {yg}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-[0.6875rem] font-medium text-muted">
              Risk band
            </span>
            <select
              defaultValue={defaultBand}
              onChange={(e) => navigate({ band: e.target.value || null })}
              className="field min-w-[120px]"
            >
              <option value="">All bands</option>
              {BANDS.map((b) => (
                <option key={b.value} value={b.value}>
                  {b.label}
                </option>
              ))}
            </select>
          </label>

          {(defaultYearGroup || defaultBand) && (
            <button
              onClick={() => {
                setSearch("");
                navigate({
                  yearGroup: null,
                  band: null,
                  studentSearch: null,
                });
              }}
              className="rounded-lg border border-border/40 bg-white px-3 py-2 text-xs font-medium text-muted calm-transition hover:text-text"
            >
              Clear all
            </button>
          )}
        </div>
      )}
    </div>
  );
}
