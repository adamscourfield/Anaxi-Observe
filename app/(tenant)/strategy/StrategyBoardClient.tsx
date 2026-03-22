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
  staffList: { id: string; fullName: string }[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PRIORITY_PILL: Record<Priority, "error" | "warning" | "success" | "neutral"> = {
  critical: "error",
  high:     "warning",
  medium:   "success",
  low:      "neutral",
};

const PRIORITY_LABEL: Record<Priority, string> = {
  critical: "Critical Priority",
  high:     "High Priority",
  medium:   "Medium Priority",
  low:      "Low Priority",
};

const STRIPE_COLOR: Record<Priority, string> = {
  critical: "bg-scale-limited-bar",
  high:     "bg-scale-some-bar",
  medium:   "bg-scale-strong-bar",
  low:      "bg-outline-variant",
};

function fmtDate(ts: Date | string) {
  return new Date(ts).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}
function fmtShort(ts: Date | string) {
  return new Date(ts).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

// ─── Staff search input ───────────────────────────────────────────────────────

function StaffSearchInput({
  staffList,
  defaultValue,
}: {
  staffList: { id: string; fullName: string }[];
  defaultValue: string;
}) {
  const [query, setQuery] = useState(defaultValue);
  const [open, setOpen] = useState(false);

  const filtered = query.trim()
    ? staffList.filter((s) =>
        s.fullName.toLowerCase().includes(query.trim().toLowerCase())
      ).slice(0, 8)
    : staffList.slice(0, 8);

  return (
    <div className="relative">
      <input type="hidden" name="owner" value={query} />
      <input
        type="text"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Search staff member..."
        maxLength={40}
        className="field"
        autoComplete="off"
      />
      {open && filtered.length > 0 && (
        <ul className="absolute left-0 right-0 top-full z-50 mt-1 max-h-[200px] overflow-y-auto rounded-xl border border-border/70 bg-surface-container-lowest shadow-md">
          {filtered.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                className="calm-transition w-full cursor-pointer px-3 py-2.5 text-left text-sm text-text hover:bg-divider/50"
                onMouseDown={() => { setQuery(s.fullName); setOpen(false); }}
              >
                {s.fullName}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── Area modal ───────────────────────────────────────────────────────────────

function AreaModal({
  area,
  onClose,
  staffList,
}: {
  area: StrategyArea | null;
  onClose: () => void;
  staffList: { id: string; fullName: string }[];
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
      <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-surface-container-lowest shadow-xl animate-in fade-in slide-in-from-bottom-3 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-2">
          <h2 className="text-[1.125rem] font-bold tracking-tight text-text">
            {area ? "Edit Strategy" : "Propose New Strategy"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="calm-transition rounded-md p-1.5 text-muted hover:bg-bg hover:text-text"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit}>
          <div className="space-y-5 px-6 pt-4 pb-2">
            {/* Strategic Area Name */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[0.6875rem] font-semibold uppercase tracking-[0.07em] text-muted">
                Strategic Area Name
              </label>
              <input
                name="title"
                required
                defaultValue={area?.title ?? ""}
                placeholder="e.g., KS3 Literacy Intervention"
                maxLength={80}
                className="field"
              />
            </div>

            {/* Target Metric + Priority Level */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[0.6875rem] font-semibold uppercase tracking-[0.07em] text-muted">
                  Target Metric
                </label>
                <div className="relative">
                  <input
                    name="category"
                    defaultValue={area?.category ?? ""}
                    placeholder="e.g., 95"
                    maxLength={10}
                    className="field pr-8"
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted">
                    %
                  </span>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[0.6875rem] font-semibold uppercase tracking-[0.07em] text-muted">
                  Priority Level
                </label>
                <select name="priority" defaultValue={area?.priority ?? "high"} className="field">
                  <option value="critical">Critical Priority</option>
                  <option value="high">High Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="low">Low Priority</option>
                </select>
              </div>
            </div>

            {/* Lead Person */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[0.6875rem] font-semibold uppercase tracking-[0.07em] text-muted">
                Lead Person
              </label>
              <StaffSearchInput
                staffList={staffList}
                defaultValue={area?.owner ?? ""}
              />
            </div>

            {/* Strategic Description */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[0.6875rem] font-semibold uppercase tracking-[0.07em] text-muted">
                Strategic Description
              </label>
              <textarea
                name="description"
                defaultValue={area?.description ?? ""}
                placeholder="Outline the primary objectives and key performance indicators..."
                rows={4}
                className="field resize-none"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-5">
            <button
              type="button"
              onClick={onClose}
              className="calm-transition rounded-lg px-5 py-2.5 text-[0.8125rem] font-semibold uppercase tracking-[0.04em] text-muted hover:text-text"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className="calm-transition rounded-lg bg-accent px-5 py-2.5 text-[0.8125rem] font-semibold uppercase tracking-[0.04em] text-on-primary hover:bg-accentHover disabled:opacity-60"
            >
              {pending ? "Saving…" : area ? "Save Changes" : "Submit Proposal"}
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
          <div className="flex items-center gap-2">
            {area.category && (
              <span className="text-[0.8125rem] font-semibold text-accent">{area.category}%</span>
            )}
          </div>
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
                  ? "border-scale-strong-bar bg-scale-strong-bg"
                  : "border-border hover:border-scale-strong-bar"
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
                className="calm-transition rounded-md bg-accent px-2.5 py-1.5 text-[0.75rem] font-semibold text-on-primary hover:bg-accentHover disabled:opacity-50"
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

export function StrategyBoardClient({ areas, canManage, staffList }: Props) {
  const [showCompleted, setShowCompleted] = useState(false);
  const [editingArea, setEditingArea] = useState<StrategyArea | null | undefined>(undefined);
  // undefined = modal closed, null = creating new, StrategyArea = editing

  const visible = areas.filter((a) => showCompleted || !a.completed);

  return (
    <>
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-surface px-3 py-1.5 text-[0.75rem] font-medium text-muted calm-transition hover:border-outline-variant hover:text-text">
          <input
            type="checkbox"
            className="sr-only"
            checked={showCompleted}
            onChange={(e) => setShowCompleted(e.target.checked)}
          />
          <span
            className={`relative inline-block h-4 w-[30px] rounded-full transition-colors duration-200 ${
              showCompleted ? "bg-accent" : "bg-surface-container-high"
            }`}
          >
            <span
              className={`absolute top-0.5 h-3 w-3 rounded-full bg-surface-container-lowest shadow transition-transform duration-200 ${
                showCompleted ? "translate-x-[14px]" : "translate-x-0.5"
              }`}
            />
          </span>
          Show completed
        </label>

        {canManage && (
          <button
            onClick={() => setEditingArea(null)}
            className="calm-transition inline-flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-2 text-[0.8125rem] font-semibold text-on-primary  hover:bg-accentHover"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Propose New Strategy
          </button>
        )}
      </div>

      {/* Grid */}
      {visible.length === 0 ? (
        <div className="panel p-8">
          <EmptyState
            title={areas.length === 0 ? "No strategies proposed yet" : "All strategies complete"}
            description={
              areas.length === 0
                ? canManage ? "Click Propose New Strategy to get started." : "No strategies have been proposed yet."
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
          staffList={staffList}
        />
      )}
    </>
  );
}
