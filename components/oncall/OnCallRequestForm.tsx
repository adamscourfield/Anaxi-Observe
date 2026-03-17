"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label, MetaText } from "@/components/ui/typography";
import { REASON_CATEGORIES, LOCATION_SUGGESTIONS } from "@/modules/oncall/types";

interface Student {
  id: string;
  fullName: string;
  upn: string;
  yearGroup?: string | null;
}

interface OnCallRequestFormProps {
  students: Student[];
}

export function OnCallRequestForm({ students }: OnCallRequestFormProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [requestType, setRequestType] = useState<"BEHAVIOUR" | "FIRST_AID">("BEHAVIOUR");
  const [location, setLocation] = useState("");
  const [behaviourReasonCategory, setBehaviourReasonCategory] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  const filtered = query.length > 0
    ? students.filter((s) =>
        s.fullName.toLowerCase().includes(query.toLowerCase()) ||
        s.upn.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 8)
    : [];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedStudent) { setError("Please select a student"); return; }
    if (!location) { setError("Please enter a location"); return; }
    if (requestType === "BEHAVIOUR" && !behaviourReasonCategory) {
      setError("Please select a behaviour reason category");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/oncall", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: selectedStudent.id,
          requestType,
          location,
          behaviourReasonCategory: requestType === "BEHAVIOUR" ? behaviourReasonCategory : undefined,
          notes: notes || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to submit");
        return;
      }
      router.push("/on-call");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="max-w-2xl space-y-5">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="oncall-student-search">Student</Label>
          <div className="relative">
            <input
              id="oncall-student-search"
              ref={searchRef}
              type="text"
              value={selectedStudent ? selectedStudent.fullName : query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedStudent(null);
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              placeholder="Search by name or UPN..."
              className="field"
              autoComplete="off"
            />
            {showDropdown && filtered.length > 0 && (
              <ul
                role="listbox"
                aria-label="Student search results"
                className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl border border-border/70 bg-surface shadow-md"
              >
                {filtered.map((s) => (
                  <li key={s.id} role="option" aria-selected={selectedStudent?.id === s.id}>
                    <button
                      type="button"
                      className="calm-transition w-full cursor-pointer px-3 py-2.5 text-left text-sm text-text hover:bg-divider/50"
                      onMouseDown={() => {
                        setSelectedStudent(s);
                        setQuery("");
                        setShowDropdown(false);
                      }}
                    >
                      {s.fullName} <span className="text-muted">({s.upn}{s.yearGroup ? ` \u00b7 ${s.yearGroup}` : ""})</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Type</Label>
          <div className="flex gap-3">
            {(["BEHAVIOUR", "FIRST_AID"] as const).map((t) => (
              <label key={t} className="flex cursor-pointer items-center gap-2 text-sm text-text">
                <input
                  type="radio"
                  name="requestType"
                  value={t}
                  checked={requestType === t}
                  onChange={() => setRequestType(t)}
                  className="accent-accent"
                />
                {t === "BEHAVIOUR" ? "Behaviour" : "First Aid"}
              </label>
            ))}
          </div>
        </div>

        {requestType === "BEHAVIOUR" && (
          <div className="space-y-1.5">
            <Label htmlFor="oncall-reason">Behaviour reason category</Label>
            <select
              id="oncall-reason"
              value={behaviourReasonCategory}
              onChange={(e) => setBehaviourReasonCategory(e.target.value)}
              className="field"
              required
            >
              <option value="">Select reason...</option>
              {REASON_CATEGORIES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="oncall-location">Location</Label>
          <input
            id="oncall-location"
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g. Hallway, Room 12..."
            list="location-suggestions"
            className="field"
            required
          />
          <datalist id="location-suggestions">
            {LOCATION_SUGGESTIONS.map((l) => <option key={l} value={l} />)}
          </datalist>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="oncall-notes">Notes <span className="font-normal text-muted">(optional)</span></Label>
          <textarea
            id="oncall-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="field"
            placeholder="Additional context..."
          />
        </div>

        {error && (
          <div className="rounded-xl border border-error/20 bg-[var(--pill-error-bg)] px-3 py-2.5">
            <MetaText className="text-[var(--pill-error-text)]">{error}</MetaText>
          </div>
        )}

        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? "Submitting..." : "Submit on call request"}
        </Button>
      </form>
    </Card>
  );
}
