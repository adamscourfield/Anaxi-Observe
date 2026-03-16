"use client";

import { useState, useTransition } from "react";
import { StatusPill } from "@/components/ui/status-pill";
import { MetaText } from "@/components/ui/typography";
import { EmptyState } from "@/components/ui/empty-state";
import {
  createStrategyArea,
  updateStrategyArea,
  toggleStrategyAreaComplete,
  deleteStrategyArea,
  createStrategyNote,
  deleteStrategyNote,
} from "./actions";

// ─── Types ────────────────────────────────────────────────────────────────────

type Priority = "critical" | "high" | "medium" | "low";

interface StrategyNote {
  id: string;
  text: string;
  createdAt: Date | string;
}

interface StrategyArea {
  id: string;
  title: string;
  category: string | null;
  description: string | null;
  priority: Priority;
  owner: string | null;
  completed: boolean;
  createdAt: Date | string;
  notes: StrategyNote[];
}

interface Props {
  areas: StrategyArea[];
  canManage: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PRIORITY_PILL: Record<Priority, "error" | "warning" | "success" | "neutral"> = {
  critical: "error",
  high:     "warning",
  medium:   "success",
  low:      "neutral",
};

const PRIORITY_LABEL: Record<Priority, string> = {
  critical: "Critical",
  high:     "High",
  medium:   "Medium",
  low:      "Low",
};

const STRIPE_COLOR: Record<Priority, string> = {
  critical: "bg-red-500",
  high:     "bg-amber-500",
  medium:   "bg-emerald-500",
  low:      "bg-slate-300",
};

function fmtDate(ts: Date | string) {
  return new Date(ts).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}
function fmtShort(ts: Date | string) {
  return new Date(ts).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

// ─── Area modal ───────────────────────────────────────────────────────────────

function AreaModal({
  area,
  onClose,
}: {
  area: StrategyArea | null;
  onClose: () => void;
}) {
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      if (area) {
        await updateStrategyArea(area.id, fd);
      } else {
        await createStrategyArea(fd);
      }
      onClose();
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "var(--overlay)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="panel w-full max-w-lg overflow-hidden animate-in fade-in slide-in-from-bottom-3 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border bg-[#f8faff] px-5 py-4">
          <h2 className="text-[0.9375rem] font-semibold tracking-tight text-text">
            {area ? "Edit strategy area" : "Add strategy area"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="calm-transition rounded-md p-1.5 text-muted hover:bg-bg hover:text-text"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 p-5">
            <div className="flex flex-col gap-1.5">
              <label className="text-[0.6875rem] font-semibold uppercase tracking-[0.07em] text-muted">
                Title *
              </label>
              <input
                name="title"
                required
                defaultValue={area?.title ?? ""}
                placeholder="e.g. Raise Attainment in Maths KS3"
                maxLength={80}
                className="field"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[0.6875rem] font-semibold uppercase tracking-[0.07em] text-muted">
                Category
              </label>
              <input
                name="category"
                defaultValue={area?.category ?? ""}
                placeholder="e.g. Curriculum, Behaviour, Staffing…"
                maxLength={40}
                className="field"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[0.6875rem] font-semibold uppercase tracking-[0.07em] text-muted">
                Description
              </label>
              <textarea
                name="description"
                defaultValue={area?.description ?? ""}
                placeholder="Brief overview of the challenge or objective…"
                rows={3}
                className="field resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[0.6875rem] font-semibold uppercase tracking-[0.07em] text-muted">
                  Priority
                </label>
                <select name="priority" defaultValue={area?.priority ?? "medium"} className="field">
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[0.6875rem] font-semibold uppercase tracking-[0.07em] text-muted">
                  Lead / Owner
                </label>
                <input
                  name="owner"
                  defaultValue={area?.owner ?? ""}
                  placeholder="Name or role"
                  maxLength={40}
                  className="field"
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 border-t border-border bg-bg px-5 py-3.5">
            <button
              type="button"
              onClick={onClose}
              className="calm-transition rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-muted hover:border-[#c4c9d0] hover:text-text"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className="calm-transition rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accentHover disabled:opacity-60"
            >
              {pending ? "Saving…" : area ? "Save changes" : "Add to board"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Tile ─────────────────────────────────────────────────────────────────────

function StrategyTile({
  area,
  canManage,
  onEdit,
}: {
  area: StrategyArea;
  canManage: boolean;
  onEdit: (area: StrategyArea) => void;
}) {
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [pending, startTransition] = useTransition();

  function handleToggleComplete() {
    startTransition(() => toggleStrategyAreaComplete(area.id));
  }

  function handleDelete() {
    if (!confirm("Remove this strategy area?")) return;
    startTransition(() => deleteStrategyArea(area.id));
  }

  function handleSaveNote() {
    const text = noteText.trim();
    if (!text) return;
    startTransition(async () => {
      await createStrategyNote(area.id, text);
      setNoteText("");
      setShowNoteInput(false);
    });
  }

  function handleDeleteNote(noteId: string) {
    startTransition(() => deleteStrategyNote(noteId));
  }

  return (
    <div
      className={`panel flex flex-col overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
        area.completed ? "opacity-50" : ""
      }`}
    >
      {/* Priority stripe */}
      <div className={`h-[3px] w-full flex-shrink-0 ${STRIPE_COLOR[area.priority]}`} />

      {/* Body */}
      <div className="p-4 pb-3">
        <div className="mb-2 flex items-start justify-between gap-2">
          {area.category && (
            <MetaText className="pt-0.5">{area.category}</MetaText>
          )}
          <StatusPill variant={PRIORITY_PILL[area.priority]} size="sm">
            {PRIORITY_LABEL[area.priority]}
          </StatusPill>
        </div>

        <div className="mb-2 flex items-start gap-2.5">
          {canManage && (
            <button
              onClick={handleToggleComplete}
              disabled={pending}
              title={area.completed ? "Mark active" : "Mark complete"}
              className={`calm-transition mt-0.5 flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center rounded-full border-[1.5px] p-0 ${
                area.completed
                  ? "border-emerald-500 bg-emerald-500"
                  : "border-border hover:border-emerald-500"
              }`}
            >
              <svg className={`h-[9px] w-[9px] ${area.completed ? "opacity-100" : "opacity-0"}`} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </button>
          )}
          <span className={`text-[0.9rem] font-semibold leading-snug tracking-tight text-text ${area.completed ? "line-through text-muted" : ""}`}>
            {area.title}
          </span>
        </div>

        {area.description && (
          <p className="text-[0.8125rem] leading-relaxed text-muted">{area.description}</p>
        )}
      </div>

      {/* Notes */}
      <div className="flex-1 px-4">
        <div className="flex items-center justify-between border-t border-divider py-2">
          <MetaText>Notes{area.notes.length > 0 ? ` · ${area.notes.length}` : ""}</MetaText>
          {canManage && (
            <button
              onClick={() => setShowNoteInput((v) => !v)}
              className="calm-transition text-[0.75rem] font-medium text-accent hover:text-accentHover"
            >
              + Add note
            </button>
          )}
        </div>

        {/* Note input */}
        {showNoteInput && (
          <div className="mb-2 flex gap-1.5">
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Add a note, update or action…"
              rows={2}
              autoFocus
              className="field flex-1 resize-none text-[0.8rem]"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSaveNote();
                if (e.key === "Escape") { setShowNoteInput(false); setNoteText(""); }
              }}
            />
            <div className="flex flex-col gap-1">
              <button
                onClick={handleSaveNote}
                disabled={!noteText.trim() || pending}
                className="calm-transition rounded-md bg-accent px-2.5 py-1.5 text-[0.75rem] font-semibold text-white hover:bg-accentHover disabled:opacity-50"
              >
                Save
              </button>
              <button
                onClick={() => { setShowNoteInput(false); setNoteText(""); }}
                className="calm-transition rounded-md border border-border bg-bg px-2.5 py-1.5 text-[0.75rem] text-muted hover:text-text"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Notes list */}
        {area.notes.length > 0 && (
          <div className="mb-2 flex flex-col gap-1.5 pb-1">
            {area.notes.map((note) => (
              <div
                key={note.id}
                className="group flex items-start gap-2 rounded-md border-l-2 border-accent/20 bg-bg px-2.5 py-2"
              >
                <span className="flex-1 text-[0.8rem] leading-relaxed text-text">{note.text}</span>
                <span className="flex-shrink-0 pt-0.5 text-[0.6875rem] text-muted">{fmtShort(note.createdAt)}</span>
                {canManage && (
                  <button
                    onClick={() => handleDeleteNote(note.id)}
                    className="calm-transition flex-shrink-0 opacity-0 group-hover:opacity-100 text-muted hover:text-error"
                  >
                    <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-2 border-t border-divider px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <MetaText>{fmtDate(area.createdAt)}</MetaText>
          {area.owner && (
            <span className="truncate rounded-full border border-divider bg-bg px-2 py-0.5 text-[0.6875rem] font-medium text-muted max-w-[130px]">
              {area.owner}
            </span>
          )}
        </div>
        {canManage && (
          <div className="flex flex-shrink-0 gap-0.5">
            <button
              onClick={() => onEdit(area)}
              className="calm-transition rounded-md p-1.5 text-muted hover:bg-bg hover:text-text"
              title="Edit"
            >
              <svg className="h-[15px] w-[15px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
            <button
              onClick={handleDelete}
              className="calm-transition rounded-md p-1.5 text-muted hover:bg-bg hover:text-error"
              title="Delete"
            >
              <svg className="h-[15px] w-[15px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                <path d="M10 11v6M14 11v6M9 6V4h6v2" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Board ────────────────────────────────────────────────────────────────────

export function StrategyBoardClient({ areas, canManage }: Props) {
  const [showCompleted, setShowCompleted] = useState(false);
  const [editingArea, setEditingArea] = useState<StrategyArea | null | undefined>(undefined);
  // undefined = modal closed, null = creating new, StrategyArea = editing

  const visible = areas.filter((a) => showCompleted || !a.completed);

  return (
    <>
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-surface px-3 py-1.5 text-[0.75rem] font-medium text-muted calm-transition hover:border-[#c7d2d8] hover:text-text">
          <input
            type="checkbox"
            className="sr-only"
            checked={showCompleted}
            onChange={(e) => setShowCompleted(e.target.checked)}
          />
          <span
            className={`relative inline-block h-4 w-[30px] rounded-full transition-colors duration-200 ${
              showCompleted ? "bg-accent" : "bg-slate-200"
            }`}
          >
            <span
              className={`absolute top-0.5 h-3 w-3 rounded-full bg-white shadow transition-transform duration-200 ${
                showCompleted ? "translate-x-[14px]" : "translate-x-0.5"
              }`}
            />
          </span>
          Show completed
        </label>

        {canManage && (
          <button
            onClick={() => setEditingArea(null)}
            className="calm-transition inline-flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-2 text-[0.8125rem] font-semibold text-white hover:bg-accentHover"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add area
          </button>
        )}
      </div>

      {/* Grid */}
      {visible.length === 0 ? (
        <div className="panel p-8">
          <EmptyState
            title={areas.length === 0 ? "No strategy areas yet" : "All areas complete"}
            description={
              areas.length === 0
                ? canManage ? "Click Add area to get started." : "No strategy areas have been added yet."
                : "Toggle Show completed to review them."
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((area) => (
            <StrategyTile
              key={area.id}
              area={area}
              canManage={canManage}
              onEdit={setEditingArea}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      {editingArea !== undefined && (
        <AreaModal
          area={editingArea}
          onClose={() => setEditingArea(undefined)}
        />
      )}
    </>
  );
}
