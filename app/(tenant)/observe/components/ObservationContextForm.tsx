"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { H1, MetaText } from "@/components/ui/typography";
import { TileOption } from "@/components/ui/tile-option";
import { DEFAULT_CONTEXT, loadDraft, persistDraft, Phase } from "./observationDraft";

type Teacher = { id: string; fullName: string; email: string };

const PHASE_OPTIONS: { key: Phase; label: string }[] = [
  { key: "INSTRUCTION", label: "Instruction" },
  { key: "GUIDED_PRACTICE", label: "Guided practice" },
  { key: "INDEPENDENT_PRACTICE", label: "Independent practice" },
  { key: "UNKNOWN", label: "Not sure" },
];

const YEAR_GROUPS = ["7", "8", "9", "10", "11", "12", "13"];

export function ObservationContextForm({ teachers, draftKey, signalKeys }: { teachers: Teacher[]; draftKey: string; signalKeys: string[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const initial = useMemo(() => loadDraft(draftKey, signalKeys).context, [draftKey, signalKeys]);
  const [context, setContext] = useState(initial || DEFAULT_CONTEXT);

  const filteredTeachers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return teachers;
    return teachers.filter((teacher) => `${teacher.fullName} ${teacher.email}`.toLowerCase().includes(q));
  }, [query, teachers]);

  const canContinue = Boolean(context.teacherId && context.yearGroup && context.subject.trim());

  return (
    <Card className="mx-auto max-w-xl space-y-4">
      <div className="flex items-center justify-between">
        <Button type="button" variant="ghost" onClick={() => router.push("/tenant/observe")}>Back</Button>
        <Button type="button" variant="ghost" onClick={() => router.push("/tenant/observe")}>Close</Button>
      </div>
      <H1>New observation</H1>

      <label className="block text-sm text-text">Teacher</label>
      <input
        className="w-full rounded-md border border-border bg-surface p-2 text-sm"
        placeholder="Search teacher"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      <select
        className="w-full rounded-md border border-border bg-surface p-2"
        value={context.teacherId}
        onChange={(event) => setContext((current) => ({ ...current, teacherId: event.target.value }))}
      >
        <option value="">Select teacher</option>
        {filteredTeachers.map((teacher) => (
          <option key={teacher.id} value={teacher.id}>{teacher.fullName} ({teacher.email})</option>
        ))}
      </select>

      <label className="block text-sm text-text">Year group</label>
      <select
        className="w-full rounded-md border border-border bg-surface p-2"
        value={context.yearGroup}
        onChange={(event) => setContext((current) => ({ ...current, yearGroup: event.target.value }))}
      >
        <option value="">Select year group</option>
        {YEAR_GROUPS.map((year) => <option key={year} value={year}>Year {year}</option>)}
      </select>

      <label className="block text-sm text-text">Subject</label>
      <input
        className="w-full rounded-md border border-border bg-surface p-2"
        placeholder="e.g. Maths"
        value={context.subject}
        onChange={(event) => setContext((current) => ({ ...current, subject: event.target.value }))}
      />

      <label className="block text-sm text-text">Lesson phase</label>
      <div className="grid grid-cols-2 gap-2">
        {PHASE_OPTIONS.map((phase) => (
          <TileOption
            key={phase.key}
            type="button"
            selected={context.phase === phase.key}
            onClick={() => setContext((current) => ({ ...current, phase: phase.key }))}
            className="text-sm"
          >
            {phase.label}
          </TileOption>
        ))}
      </div>

      <Button
        type="button"
        disabled={!canContinue}
        onClick={() => {
          persistDraft(draftKey, { context, signalState: loadDraft(draftKey, signalKeys).signalState });
          router.push("/tenant/observe/new/signals");
        }}
        className="w-full"
      >
        Continue
      </Button>
      <MetaText>Deliberate, calm, and transparent capture flow.</MetaText>
    </Card>
  );
}
