"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { DEFAULT_CONTEXT, loadDraft, persistDraft, Phase } from "./observationDraft";

type Teacher = { id: string; fullName: string; email: string };

const PHASE_OPTIONS: { key: Phase; label: string; description: string; icon: React.ReactNode }[] = [
  {
    key: "INSTRUCTION",
    label: "Instruction",
    description: "Teacher-led delivery",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5" xmlns="http://www.w3.org/2000/svg">
        <path d="M10 3.5 4 7l6 3.5L16 7 10 3.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M4 11l6 3.5 6-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    key: "GUIDED_PRACTICE",
    label: "Guided practice",
    description: "Supported application",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5" xmlns="http://www.w3.org/2000/svg">
        <path d="M6 10h8M10 6v8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="10" cy="10" r="6.5" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    key: "INDEPENDENT_PRACTICE",
    label: "Independent",
    description: "Students working alone",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5" xmlns="http://www.w3.org/2000/svg">
        <path d="M6.5 9.5a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0ZM3.5 16.5a6.5 6.5 0 0 1 13 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    key: "UNKNOWN",
    label: "Not sure",
    description: "Mixed or unclear",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5" xmlns="http://www.w3.org/2000/svg">
        <circle cx="10" cy="10" r="6.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M8.5 7.5a1.5 1.5 0 1 1 1.5 1.5v1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="10" cy="13" r="0.5" fill="currentColor" />
      </svg>
    ),
  },
];

const YEAR_GROUPS = ["7", "8", "9", "10", "11", "12", "13"];

export function ObservationContextForm({
  teachers,
  draftKey,
  signalKeys,
}: {
  teachers: Teacher[];
  draftKey: string;
  signalKeys: string[];
}) {
  const router = useRouter();
  const initial = useMemo(() => loadDraft(draftKey, signalKeys).context, [draftKey, signalKeys]);
  const [context, setContext] = useState(initial || DEFAULT_CONTEXT);

  const teacherOptions = useMemo(
    () => teachers.map((t) => ({ value: t.id, label: t.fullName, detail: t.email })),
    [teachers]
  );
  const yearGroupOptions = YEAR_GROUPS.map((y) => ({ value: y, label: `Year ${y}` }));
  const canContinue = Boolean(context.teacherId && context.yearGroup && context.subject.trim());

  return (
    <div className="mx-auto max-w-xl">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[0.8125rem] font-medium text-muted calm-transition hover:bg-white/60 hover:text-text"
        >
          <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5">
            <path d="M10 3.5 5.5 8l4.5 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back
        </button>
        <div className="flex items-center gap-2">
          <span className="text-[0.75rem] font-semibold text-muted">Step 1 of 3</span>
          <div className="flex gap-1">
            <span className="h-1.5 w-6 rounded-full bg-accent" />
            <span className="h-1.5 w-6 rounded-full bg-border" />
            <span className="h-1.5 w-6 rounded-full bg-border" />
          </div>
        </div>
        <button
          type="button"
          onClick={() => router.push("/observe")}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted calm-transition hover:bg-white/60 hover:text-text"
        >
          <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4">
            <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Title */}
      <div className="mb-7">
        <h1 className="text-[1.625rem] font-bold tracking-tight text-text">New observation</h1>
        <p className="mt-1.5 text-[0.9375rem] text-muted">Set the context before capturing signals.</p>
      </div>

      {/* Form */}
      <div className="space-y-6">
        {/* Teacher */}
        <div className="space-y-2">
          <label className="text-[0.6875rem] font-semibold uppercase tracking-[0.07em] text-muted">
            Teacher
          </label>
          <SearchableSelect
            options={teacherOptions}
            value={context.teacherId}
            onChange={(value) => setContext((c) => ({ ...c, teacherId: value }))}
            placeholder="Select teacher…"
            searchPlaceholder="Search by name or email…"
          />
        </div>

        {/* Year group */}
        <div className="space-y-2">
          <label className="text-[0.6875rem] font-semibold uppercase tracking-[0.07em] text-muted">
            Year group
          </label>
          <SearchableSelect
            options={yearGroupOptions}
            value={context.yearGroup}
            onChange={(value) => setContext((c) => ({ ...c, yearGroup: value }))}
            placeholder="Select year group…"
            searchPlaceholder="Search year group…"
          />
        </div>

        {/* Subject */}
        <div className="space-y-2">
          <label className="text-[0.6875rem] font-semibold uppercase tracking-[0.07em] text-muted">
            Subject
          </label>
          <input
            className="field"
            placeholder="e.g. Mathematics, English, Science…"
            value={context.subject}
            onChange={(e) => setContext((c) => ({ ...c, subject: e.target.value }))}
          />
        </div>

        {/* Phase */}
        <div className="space-y-2">
          <label className="text-[0.6875rem] font-semibold uppercase tracking-[0.07em] text-muted">
            Lesson phase
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            {PHASE_OPTIONS.map((phase) => {
              const selected = context.phase === phase.key;
              return (
                <button
                  key={phase.key}
                  type="button"
                  onClick={() => setContext((c) => ({ ...c, phase: phase.key }))}
                  className={`flex items-center justify-between gap-2 rounded-xl border p-3.5 text-left calm-transition ${
                    selected
                      ? "border-accent bg-accent/[0.06] text-accent ring-1 ring-accent/20"
                      : "border-border bg-white/70 text-text hover:border-accent/30 hover:bg-white/90"
                  }`}
                >
                  <span>
                    <span className="block text-[0.8125rem] font-semibold leading-tight">{phase.label}</span>
                    <span className={`block text-[0.75rem] leading-tight ${selected ? "text-accent/70" : "text-muted"}`}>
                      {phase.description}
                    </span>
                  </span>
                  <span className={`shrink-0 ${selected ? "text-accent" : "text-muted"}`}>{phase.icon}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Continue */}
        <div className="pt-2">
          <button
            type="button"
            disabled={!canContinue}
            onClick={() => {
              persistDraft(draftKey, {
                context,
                signalState: loadDraft(draftKey, signalKeys).signalState,
              });
              router.push("/observe/new/signals");
            }}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-3 text-[0.9375rem] font-semibold text-white shadow-sm calm-transition hover:bg-accentHover disabled:cursor-not-allowed disabled:opacity-40"
          >
            Continue to signals
            <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4">
              <path d="M6 3.5 10.5 8 6 12.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          {!canContinue && (
            <p className="mt-2.5 text-center text-[0.75rem] text-muted">
              Fill in teacher, year group and subject to continue.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
