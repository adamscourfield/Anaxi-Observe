"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface User {
  id: string;
  fullName: string;
  email: string;
}

interface ActionFormProps {
  meetingId: string;
  attendees: User[];
  onCreated?: () => void;
  onCancel?: () => void;
}

export function ActionForm({ meetingId, attendees, onCreated, onCancel }: ActionFormProps) {
  const [description, setDescription] = useState("");
  const [ownerUserId, setOwnerUserId] = useState(attendees[0]?.id ?? "");
  const [dueDate, setDueDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch(`/api/meetings/${meetingId}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description,
          ownerUserId,
          dueDate: dueDate || undefined,
        }),
      });

      if (!res.ok) {
        const json = await res.json();
        setError(json.error ?? "Failed to create action");
        setSubmitting(false);
        return;
      }

      setDescription("");
      setDueDate("");
      onCreated?.();
    } catch {
      setError("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded border border-border p-3">
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div>
        <label className="mb-1 block text-xs font-medium text-text">Description</label>
        <textarea
          required
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="w-full rounded border border-border bg-bg p-2 text-sm"
          placeholder="What needs to be done?"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-text">Owner</label>
          <select
            required
            value={ownerUserId}
            onChange={(e) => setOwnerUserId(e.target.value)}
            className="w-full rounded border border-border bg-bg p-2 text-sm"
          >
            <option value="">Select person</option>
            {attendees.map((u) => (
              <option key={u.id} value={u.id}>{u.fullName}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-text">Due date</label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full rounded border border-border bg-bg p-2 text-sm"
          />
        </div>
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={submitting}>{submitting ? "Adding…" : "Add Action"}</Button>
        {onCancel && <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>}
      </div>
    </form>
  );
}
