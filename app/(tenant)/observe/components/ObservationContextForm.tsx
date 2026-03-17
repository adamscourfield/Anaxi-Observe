"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { H1, MetaText, Label } from "@/components/ui/typography";
import { TileOption } from "@/components/ui/tile-option";
import { SearchableSelect } from "@/components/ui/searchable-select";
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
  const initial = useMemo(() => loadDraft(draftKey, signalKeys).context, [draftKey, signalKeys]);
  const [context, setContext] = useState(initial || DEFAULT_CONTEXT);

  const teacherOptions = useMemo(
    () => teachers.map((t) => ({ value: t.id, label: t.fullName, detail: t.email })),
    [teachers]
  );

  const yearGroupOptions = YEAR_GROUPS.map((y) => ({ value: y, label: `Year ${y}` }));

  const canContinue = Boolean(context.teacherId && context.yearGroup && context.subject.trim());

  return (
    <Card className="mx-auto max-w-xl space-y-5">
      <div className="flex items-center justify-between">
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          <svg viewBox="0 0 16 16" fill="none" className="mr-1 h-3.5 w-3.5"><path d="M10 3.5 5.5 8l4.5 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          Back
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.push("/observe")}>
          <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
        </Button>
      </div>
      <H1>New observation</H1>

      <div>
        <Label>Teacher</Label>
        <SearchableSelect
          options={teacherOptions}
          value={context.teacherId}
          onChange={(value) => setContext((current) => ({ ...current, teacherId: value }))}
          placeholder="Select teacher"
          searchPlaceholder="Search by name or email…"
        />
      </div>

      <div>
        <Label>Year group</Label>
        <SearchableSelect
          options={yearGroupOptions}
          value={context.yearGroup}
          onChange={(value) => setContext((current) => ({ ...current, yearGroup: value }))}
          placeholder="Select year group"
          searchPlaceholder="Search year group…"
        />
      </div>

      <div>
        <Label>Subject</Label>
        <input
          className="field"
          placeholder="e.g. Maths"
          value={context.subject}
          onChange={(event) => setContext((current) => ({ ...current, subject: event.target.value }))}
        />
      </div>

      <div>
        <Label>Lesson phase</Label>
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
      </div>

      <Button
        type="button"
        disabled={!canContinue}
        onClick={() => {
          persistDraft(draftKey, { context, signalState: loadDraft(draftKey, signalKeys).signalState });
          router.push("/observe/new/signals");
        }}
        className="w-full"
      >
        Continue
      </Button>
      <MetaText className="text-center">Deliberate, calm, and transparent capture flow.</MetaText>
    </Card>
  );
}
