"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { MetaText } from "@/components/ui/typography";

/* ── Types ─────────────────────────────────────────────────────────────── */

interface Attendee {
  id: string;
  userId: string;
  user: { id: string; fullName: string; email: string };
}

interface Action {
  id: string;
  description: string;
  ownerUserId: string;
  owner: { id: string; fullName: string };
  dueDate?: Date | string | null;
  status: "OPEN" | "DONE" | "BLOCKED";
}

interface LiveMeetingViewProps {
  meetingId: string;
  title: string;
  type: string;
  status: string;
  startDateTime: string;
  attendees: Attendee[];
  initialNotes: string;
  actions: Action[];
  canEdit: boolean;
  canAddActions: boolean;
  currentUserId: string;
}

/* ── Helpers ──────────────────────────────────────────────────────────── */

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getFirstName(name: string): string {
  const parts = name.split(" ");
  return parts[0] + (parts.length > 1 ? " " + parts[1][0] + "." : "");
}

function isOverdue(dueDate: Date | string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(dueDate) < today;
}

function formatDueDate(dueDate: Date | string): string {
  const d = new Date(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diff === 0) return "Today";
  if (diff < 0) return "OVERDUE";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/* ── Timer Hook ──────────────────────────────────────────────────────── */

function useElapsedTimer(startDateTime: string) {
  const [elapsed, setElapsed] = useState(() => {
    const diff = Date.now() - new Date(startDateTime).getTime();
    return Math.max(0, Math.floor(diff / 1000));
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const diff = Date.now() - new Date(startDateTime).getTime();
      setElapsed(Math.max(0, Math.floor(diff / 1000)));
    }, 1000);
    return () => clearInterval(interval);
  }, [startDateTime]);

  const hrs = String(Math.floor(elapsed / 3600)).padStart(2, "0");
  const mins = String(Math.floor((elapsed % 3600) / 60)).padStart(2, "0");
  const secs = String(elapsed % 60).padStart(2, "0");
  return `${hrs}:${mins}:${secs}`;
}

/* ── Avatar Stack ────────────────────────────────────────────────────── */

const AVATAR_COLORS = [
  "bg-[var(--scale-limited-light)] text-[var(--scale-limited-text)]",
  "bg-[var(--scale-some-light)] text-[var(--scale-some-text)]",
  "bg-[var(--scale-strong-light)] text-[var(--scale-strong-text)]",
  "bg-[var(--scale-consistent-light)] text-[var(--scale-consistent-text)]",
  "bg-[var(--cat-violet-bg)] text-[var(--cat-violet-text)]",
  "bg-[var(--cat-indigo-bg)] text-[var(--cat-indigo-text)]",
];

function AvatarStack({ attendees }: { attendees: Attendee[] }) {
  const maxShow = 3;
  const shown = attendees.slice(0, maxShow);
  const overflow = attendees.length - maxShow;

  return (
    <div className="flex items-center">
      <div className="flex -space-x-2">
        {shown.map((a, i) => (
          <div
            key={a.id}
            title={a.user.fullName}
            className={`flex h-8 w-8 items-center justify-center rounded-full border-2 border-surface-container-lowest text-[11px] font-bold ${AVATAR_COLORS[i % AVATAR_COLORS.length]}`}
          >
            {getInitials(a.user.fullName)}
          </div>
        ))}
        {overflow > 0 && (
          <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-surface-container-lowest bg-[var(--surface-container-high)] text-[11px] font-semibold text-muted">
            +{overflow}
          </div>
        )}
      </div>
      <span className="ml-3 text-sm text-muted">{attendees.length} Attendees Present</span>
    </div>
  );
}

/* ── Formatting Toolbar ──────────────────────────────────────────────── */

function FormattingToolbar() {
  return (
    <div className="flex items-center gap-1">
      <button type="button" className="rounded-md p-1.5 text-muted hover:bg-[var(--surface-container)] hover:text-text calm-transition" title="Bold">
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6V4zm0 8h9a4 4 0 014 4 4 4 0 01-4 4H6v-8z" stroke="currentColor" strokeWidth="2" fill="none" /></svg>
      </button>
      <button type="button" className="rounded-md p-1.5 text-muted hover:bg-[var(--surface-container)] hover:text-text calm-transition" title="Italic">
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="4" x2="10" y2="4" /><line x1="14" y1="20" x2="5" y2="20" /><line x1="15" y1="4" x2="9" y2="20" /></svg>
      </button>
      <button type="button" className="rounded-md p-1.5 text-muted hover:bg-[var(--surface-container)] hover:text-text calm-transition" title="List">
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg>
      </button>
      <button type="button" className="rounded-md p-1.5 text-muted hover:bg-[var(--surface-container)] hover:text-text calm-transition" title="Link">
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" /></svg>
      </button>
    </div>
  );
}

/* ── Main Component ──────────────────────────────────────────────────── */

export function LiveMeetingView({
  meetingId,
  title,
  type,
  status,
  startDateTime,
  attendees,
  initialNotes,
  actions,
  canEdit,
  canAddActions,
  currentUserId,
}: LiveMeetingViewProps) {
  const timer = useElapsedTimer(startDateTime);
  const [notes, setNotes] = useState(initialNotes);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ── Action form state ─────────────────────────────────────────── */
  const [taskDesc, setTaskDesc] = useState("");
  const [assignToId, setAssignToId] = useState(attendees[0]?.userId ?? "");
  const [dueDate, setDueDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  /* ── Auto-save notes ───────────────────────────────────────────── */
  const handleNotesChange = useCallback(
    (value: string) => {
      setNotes(value);
      setSaveStatus("saving");
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        try {
          const res = await fetch(`/api/meetings/${meetingId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ notes: value }),
          });
          setSaveStatus(res.ok ? "saved" : "idle");
        } catch {
          setSaveStatus("idle");
        }
      }, 1500);
    },
    [meetingId],
  );

  /* ── Save draft (manual) ───────────────────────────────────────── */
  async function handleSaveDraft() {
    setSaveStatus("saving");
    try {
      const res = await fetch(`/api/meetings/${meetingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });
      setSaveStatus(res.ok ? "saved" : "idle");
    } catch {
      setSaveStatus("idle");
    }
  }

  /* ── Add action ────────────────────────────────────────────────── */
  async function handleAddAction(e: React.FormEvent) {
    e.preventDefault();
    if (!taskDesc.trim()) return;
    setSubmitting(true);
    setFormError(null);
    try {
      const res = await fetch(`/api/meetings/${meetingId}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: taskDesc,
          ownerUserId: assignToId,
          dueDate: dueDate || undefined,
        }),
      });
      if (!res.ok) {
        const json = await res.json();
        setFormError(json.error ?? "Failed to create action");
      } else {
        setTaskDesc("");
        setDueDate("");
      }
    } catch {
      setFormError("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  const isInProgress = status === "CONFIRMED" || status === "PENDING";
  const totalActions = actions.length;
  const openActions = actions.filter((a) => a.status === "OPEN");

  const saveStatusLabel =
    saveStatus === "saving"
      ? "AUTO-SAVING TO CLOUD..."
      : saveStatus === "saved"
        ? "SAVED TO CLOUD"
        : "READY";

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div>
        <div className="flex flex-wrap items-center gap-3 mb-2">
          <span className="rounded-md bg-[var(--primary-container)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-on-primary">
            Anaxi Core
          </span>
          {isInProgress && (
            <span className="flex items-center gap-1.5 text-sm font-semibold text-scale-strong-text">
              <span className="inline-block h-2 w-2 rounded-full bg-scale-strong-bg0" />
              IN PROGRESS
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-[30px] font-bold leading-tight tracking-[-0.025em] text-text">
              {title}
            </h1>
            <div className="flex flex-wrap items-center gap-4">
              <span className="flex items-center gap-1.5 font-mono text-sm text-muted">
                {/* Record dot icon */}
                <svg className="h-3.5 w-3.5 text-text" viewBox="0 0 16 16" fill="currentColor">
                  <circle cx="8" cy="8" r="6" />
                </svg>
                {timer}
              </span>
              <AvatarStack attendees={attendees} />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSaveDraft}
              className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-text calm-transition hover:bg-[var(--surface-container-low)]"
            >
              {/* Floppy disk icon */}
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
                <polyline points="17 21 17 13 7 13 7 21" />
                <polyline points="7 3 7 8 15 8" />
              </svg>
              Save Draft
            </button>
            <Button variant="danger" className="rounded-xl px-5">
              End Meeting
            </Button>
          </div>
        </div>
      </div>

      {/* ── Two-Column Layout ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
        {/* ── Left: Live Minutes ───────────────────────────────────── */}
        <div className="rounded-2xl border border-border/50 bg-surface-container-lowest p-6 shadow-sm">
          {/* Minutes Header */}
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5 text-text" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
              <h2 className="text-lg font-bold text-text">Live Minutes</h2>
            </div>
            <FormattingToolbar />
          </div>

          {/* Notes textarea */}
          <textarea
            value={notes}
            onChange={(e) => canEdit && handleNotesChange(e.target.value)}
            readOnly={!canEdit}
            rows={18}
            className="w-full resize-none rounded-xl border-0 bg-transparent p-0 font-sans text-sm leading-relaxed text-text placeholder:text-muted/60 focus:outline-none focus:ring-0"
            placeholder={`${new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })} - INTRODUCTION\n\nStart taking meeting minutes here...`}
          />

          {/* Footer */}
          <div className="mt-4 flex items-center justify-between border-t border-border/30 pt-3">
            <MetaText className="uppercase tracking-wider">
              {saveStatusLabel}
            </MetaText>
            <MetaText className="uppercase tracking-wider">
              Characters: {notes.length}
            </MetaText>
          </div>
        </div>

        {/* ── Right Column ────────────────────────────────────────── */}
        <div className="space-y-5">
          {/* ── New Action Item Card ────────────────────────────────── */}
          {canAddActions && (
            <div className="rounded-2xl border border-border/50 bg-surface-container-lowest p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <svg className="h-5 w-5 text-scale-strong-text" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <h3 className="text-base font-bold text-text">New Action Item</h3>
              </div>

              {formError && (
                <div className="mb-3 rounded-xl border border-error/20 bg-[var(--pill-error-bg)] px-3 py-2">
                  <MetaText className="text-[var(--pill-error-text)]">{formError}</MetaText>
                </div>
              )}

              <form onSubmit={handleAddAction} className="space-y-3">
                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted">
                    Task Description
                  </label>
                  <input
                    type="text"
                    value={taskDesc}
                    onChange={(e) => setTaskDesc(e.target.value)}
                    placeholder="e.g., Update Science lab schedule"
                    className="field"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted">
                      Assign To
                    </label>
                    <select
                      value={assignToId}
                      onChange={(e) => {
                        setAssignToId(e.target.value);
                      }}
                      className="field"
                    >
                      {attendees.map((a) => (
                        <option key={a.userId} value={a.userId}>
                          {a.user.fullName}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted">
                      Due Date
                    </label>
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="field"
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  variant="danger"
                  disabled={submitting}
                  className="w-full rounded-xl text-sm"
                >
                  {submitting ? "ADDING..." : "ADD ACTION ITEM"}
                </Button>
              </form>
            </div>
          )}

          {/* ── Session Tasks ──────────────────────────────────────── */}
          <div className="rounded-2xl border border-border/50 bg-surface-container-lowest p-5 shadow-sm">
            <h3 className="mb-4 text-base font-bold text-text">Session Tasks</h3>
            {openActions.length === 0 && totalActions === 0 ? (
              <p className="text-sm text-muted">No tasks yet. Add one above.</p>
            ) : (
              <div className="space-y-4">
                {actions.slice(0, 3).map((action) => {
                  const overdue = action.status === "OPEN" && action.dueDate && isOverdue(action.dueDate);
                  return (
                    <div key={action.id} className="flex items-start gap-3">
                      {/* Status circle */}
                      <div className="mt-0.5 flex-shrink-0">
                        {action.status === "DONE" ? (
                          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-scale-strong-bg0">
                            <svg className="h-2.5 w-2.5 text-on-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          </div>
                        ) : overdue ? (
                          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-error text-on-primary">
                            <svg className="h-2.5 w-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                              <line x1="12" y1="8" x2="12" y2="12" />
                              <line x1="12" y1="16" x2="12.01" y2="16" />
                            </svg>
                          </div>
                        ) : (
                          <div className="h-5 w-5 rounded-full border-[1.5px] border-border" />
                        )}
                      </div>
                      {/* Task content */}
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm font-medium leading-snug ${action.status === "DONE" ? "text-muted line-through" : "text-text"}`}>
                          {action.description}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <span className="rounded bg-[var(--surface-container)] px-1.5 py-0.5 text-[10px] font-semibold text-muted">
                            {getFirstName(action.owner.fullName)}
                          </span>
                          {action.dueDate && (
                            <span
                              className={`text-[11px] font-semibold ${
                                overdue ? "text-error" : "text-muted"
                              }`}
                            >
                              {formatDueDate(action.dueDate)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {totalActions > 3 && (
              <button
                type="button"
                className="mt-4 w-full text-center text-[11px] font-bold uppercase tracking-wider text-muted hover:text-text calm-transition"
              >
                View All {totalActions} Tasks
              </button>
            )}
          </div>

          {/* ── Efficiency Index ────────────────────────────────────── */}
          <div className="rounded-2xl bg-[var(--primary-container)] p-5 text-on-primary">
            <div className="mb-2 flex items-center gap-2">
              <svg className="h-5 w-5 text-on-primary/80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                <polyline points="17 6 23 6 23 12" />
              </svg>
              <h3 className="text-lg font-bold text-on-primary">Efficiency Index</h3>
            </div>
            <p className="text-sm leading-relaxed text-on-primary/70">
              This session is moving{" "}
              <span className="font-semibold text-on-primary">14% faster</span> than
              typical {type} reviews.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
