"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
      router.push("/tenant/on-call");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="max-w-2xl space-y-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Student search */}
        <div className="space-y-1">
          <label className="text-sm font-medium text-text">Student</label>
          <div className="relative">
            <input
              ref={searchRef}
              type="text"
              value={selectedStudent ? selectedStudent.fullName : query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedStudent(null);
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              placeholder="Search by name or UPN…"
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent"
              autoComplete="off"
            />
            {showDropdown && filtered.length > 0 && (
              <ul className="absolute z-10 mt-1 w-full rounded-md border border-border bg-surface shadow-md">
                {filtered.map((s) => (
                  <li
                    key={s.id}
                    className="cursor-pointer px-3 py-2 text-sm text-text hover:bg-bg"
                    onMouseDown={() => {
                      setSelectedStudent(s);
                      setQuery("");
                      setShowDropdown(false);
                    }}
                  >
                    {s.fullName} <span className="text-muted">({s.upn}{s.yearGroup ? ` · ${s.yearGroup}` : ""})</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Type */}
        <div className="space-y-1">
          <label className="text-sm font-medium text-text">Type</label>
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

        {/* Behaviour reason */}
        {requestType === "BEHAVIOUR" && (
          <div className="space-y-1">
            <label className="text-sm font-medium text-text">Behaviour reason category</label>
            <select
              value={behaviourReasonCategory}
              onChange={(e) => setBehaviourReasonCategory(e.target.value)}
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text"
              required
            >
              <option value="">Select reason…</option>
              {REASON_CATEGORIES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
        )}

        {/* Location */}
        <div className="space-y-1">
          <label className="text-sm font-medium text-text">Location</label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g. Hallway, Room 12…"
            list="location-suggestions"
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent"
            required
          />
          <datalist id="location-suggestions">
            {LOCATION_SUGGESTIONS.map((l) => <option key={l} value={l} />)}
          </datalist>
        </div>

        {/* Notes */}
        <div className="space-y-1">
          <label className="text-sm font-medium text-text">Notes <span className="text-muted">(optional)</span></label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent"
            placeholder="Additional context…"
          />
        </div>

        {error && <p className="text-sm text-error">{error}</p>}

        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? "Submitting…" : "Submit On Call Request"}
        </Button>
      </form>
    </Card>
  );
}
