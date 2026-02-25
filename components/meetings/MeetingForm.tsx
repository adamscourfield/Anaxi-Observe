"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
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
    <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-border bg-surface p-6">
      {error && <p className="rounded bg-red-50 p-2 text-sm text-red-700">{error}</p>}

      <div className="grid grid-cols-2 gap-4">
        <label className="text-sm font-medium text-text">Title</label>
        <input required name="title" className="rounded border border-border bg-bg p-2 text-sm" />

        <label className="text-sm font-medium text-text">Type</label>
        <select name="type" defaultValue="OTHER" className="rounded border border-border bg-bg p-2 text-sm">
          {MEETING_TYPES.map((t) => (
            <option key={t} value={t}>{MEETING_TYPE_LABELS[t]}</option>
          ))}
        </select>

        <label className="text-sm font-medium text-text">Start</label>
        <input required type="datetime-local" name="startDateTime" className="rounded border border-border bg-bg p-2 text-sm" />

        <label className="text-sm font-medium text-text">End</label>
        <input required type="datetime-local" name="endDateTime" className="rounded border border-border bg-bg p-2 text-sm" />

        <label className="text-sm font-medium text-text">Location</label>
        <input name="location" className="rounded border border-border bg-bg p-2 text-sm" placeholder="Optional" />

        <label className="col-span-2 text-sm font-medium text-text">Notes</label>
        <textarea name="notes" rows={4} className="col-span-2 rounded border border-border bg-bg p-2 text-sm" placeholder="Markdown supported" />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-text">Attendees</label>
        <input
          type="text"
          placeholder="Search people..."
          value={attendeeSearch}
          onChange={(e) => setAttendeeSearch(e.target.value)}
          className="mb-2 w-full rounded border border-border bg-bg p-2 text-sm"
        />
        <div className="mb-2 flex flex-wrap gap-2">
          {selectedAttendees.map((a) => (
            <span key={a.id} className="flex items-center gap-1 rounded-full bg-divider px-3 py-1 text-xs text-text">
              {a.fullName}
              {a.id !== currentUserId && (
                <button type="button" onClick={() => toggleAttendee(a)} className="text-text hover:text-red-600">×</button>
              )}
            </span>
          ))}
        </div>
        <div className="max-h-40 overflow-auto rounded border border-border bg-bg">
          {filteredUsers.map((u) => (
            <button
              key={u.id}
              type="button"
              onClick={() => toggleAttendee(u)}
              className="w-full px-3 py-2 text-left text-sm text-text hover:bg-divider"
            >
              {u.fullName} <span className="text-xs opacity-60">{u.email}</span>
            </button>
          ))}
          {filteredUsers.length === 0 && <p className="p-2 text-xs opacity-60">No more people to add</p>}
        </div>
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={submitting}>{submitting ? "Creating…" : "Create Meeting"}</Button>
        <Button type="button" variant="secondary" onClick={() => router.back()}>Cancel</Button>
      </div>
    </form>
  );
}
