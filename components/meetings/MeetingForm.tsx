"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label, MetaText } from "@/components/ui/typography";
import { MEETING_TYPE_LABELS } from "@/modules/meetings/types";

const MEETING_TYPES = Object.keys(MEETING_TYPE_LABELS) as Array<keyof typeof MEETING_TYPE_LABELS>;

interface User {
  id: string;
  fullName: string;
  email: string;
}

interface MeetingFormProps {
  users: User[];
  currentUserId: string;
}

export function MeetingForm({ users, currentUserId }: MeetingFormProps) {
  const router = useRouter();
  const [attendeeSearch, setAttendeeSearch] = useState("");
  const [selectedAttendees, setSelectedAttendees] = useState<User[]>(
    users.filter((u) => u.id === currentUserId)
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const filteredUsers = users.filter(
    (u) =>
      (u.fullName.toLowerCase().includes(attendeeSearch.toLowerCase()) ||
        u.email.toLowerCase().includes(attendeeSearch.toLowerCase())) &&
      !selectedAttendees.some((a) => a.id === u.id)
  );

  function toggleAttendee(user: User) {
    setSelectedAttendees((prev) =>
      prev.some((a) => a.id === user.id)
        ? prev.filter((a) => a.id !== user.id)
        : [...prev, user]
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const form = e.currentTarget;
    const data = new FormData(form);

    const body = {
      title: data.get("title") as string,
      type: data.get("type") as string,
      startDateTime: data.get("startDateTime") as string,
      endDateTime: data.get("endDateTime") as string,
      location: data.get("location") as string,
      notes: data.get("notes") as string,
      attendeeIds: selectedAttendees.map((a) => a.id),
    };

    try {
      const res = await fetch("/api/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const json = await res.json();
        setError(json.error ?? "Something went wrong");
        setSubmitting(false);
        return;
      }

      const meeting = await res.json();
      router.push(`/tenant/meetings/${meeting.id}`);
    } catch {
      setError("Network error");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="panel space-y-5 p-6">
      {error && (
        <div className="rounded-xl border border-error/20 bg-[var(--pill-error-bg)] px-3 py-2.5">
          <MetaText className="text-[var(--pill-error-text)]">{error}</MetaText>
        </div>
      )}

      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="meeting-title">Title</Label>
            <input id="meeting-title" required name="title" className="field" placeholder="Meeting title" />
          </div>
          <div>
            <Label htmlFor="meeting-type">Type</Label>
            <select id="meeting-type" name="type" defaultValue="OTHER" className="field">
              {MEETING_TYPES.map((t) => (
                <option key={t} value={t}>{MEETING_TYPE_LABELS[t]}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="meeting-start">Start</Label>
            <input id="meeting-start" required type="datetime-local" name="startDateTime" className="field" />
          </div>
          <div>
            <Label htmlFor="meeting-end">End</Label>
            <input id="meeting-end" required type="datetime-local" name="endDateTime" className="field" />
          </div>
        </div>

        <div>
          <Label htmlFor="meeting-location">Location</Label>
          <input id="meeting-location" name="location" className="field" placeholder="Optional" />
        </div>

        <div>
          <Label htmlFor="meeting-notes">Notes</Label>
          <textarea id="meeting-notes" name="notes" rows={4} className="field" placeholder="Markdown supported" />
        </div>
      </div>

      <div>
        <Label>Attendees</Label>
        <div className="mb-3 flex flex-wrap gap-2">
          {selectedAttendees.map((a) => (
            <span key={a.id} className="flex items-center gap-1.5 rounded-full border border-border/60 bg-divider/60 px-3 py-1 text-xs font-medium text-text">
              {a.fullName}
              {a.id !== currentUserId && (
                <button type="button" onClick={() => toggleAttendee(a)} className="calm-transition text-muted hover:text-error" aria-label={`Remove ${a.fullName}`}>
                  <svg viewBox="0 0 12 12" fill="none" className="h-3 w-3"><path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                </button>
              )}
            </span>
          ))}
        </div>
        <input
          type="text"
          placeholder="Search people..."
          value={attendeeSearch}
          onChange={(e) => setAttendeeSearch(e.target.value)}
          className="field mb-2"
        />
        <div className="max-h-40 overflow-auto rounded-xl border border-border/60 bg-bg/40">
          {filteredUsers.map((u) => (
            <button
              key={u.id}
              type="button"
              onClick={() => toggleAttendee(u)}
              className="calm-transition w-full px-3 py-2.5 text-left text-sm text-text hover:bg-divider/50"
            >
              {u.fullName} <span className="text-xs text-muted">{u.email}</span>
            </button>
          ))}
          {filteredUsers.length === 0 && <p className="p-3 text-xs text-muted">No more people to add</p>}
        </div>
      </div>

      <div className="flex gap-2 border-t border-border/50 pt-4">
        <Button type="submit" disabled={submitting}>{submitting ? "Creating..." : "Create meeting"}</Button>
        <Button type="button" variant="ghost" onClick={() => router.back()}>Cancel</Button>
      </div>
    </form>
  );
}
