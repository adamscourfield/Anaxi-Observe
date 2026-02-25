"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface NotesEditorProps {
  meetingId: string;
  initialNotes: string;
  canEdit: boolean;
  onSave?: (notes: string) => void;
}

export function NotesEditor({ meetingId, initialNotes, canEdit, onSave }: NotesEditorProps) {
  const [editing, setEditing] = useState(false);
  const [notes, setNotes] = useState(initialNotes);
  const [draft, setDraft] = useState(initialNotes);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/meetings/${meetingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: draft }),
      });
      if (!res.ok) {
        const json = await res.json();
        setError(json.error ?? "Failed to save");
        setSaving(false);
        return;
      }
      setNotes(draft);
      setEditing(false);
      onSave?.(draft);
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <div className="space-y-2">
        {notes ? (
          <pre className="whitespace-pre-wrap font-sans text-sm text-text">{notes}</pre>
        ) : (
          <p className="text-sm opacity-60">No notes yet.</p>
        )}
        {canEdit && (
          <Button variant="secondary" onClick={() => { setDraft(notes); setEditing(true); }}>
            Edit Notes
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {error && <p className="text-sm text-red-600">{error}</p>}
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        rows={8}
        className="w-full rounded border border-border bg-bg p-2 text-sm"
        placeholder="Add meeting notes (Markdown supported)"
      />
      <div className="flex gap-2">
        <Button onClick={handleSave} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
        <Button variant="secondary" onClick={() => setEditing(false)}>Cancel</Button>
      </div>
    </div>
  );
}
