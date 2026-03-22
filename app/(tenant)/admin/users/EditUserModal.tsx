"use client";

import { useState, useMemo, useRef, useEffect, useTransition } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type EditableUser = {
  id: string;
  fullName: string;
  email: string;
  role: string;
  isActive: boolean;
  receivesOnCallEmails: boolean;
  canApproveAllLoa: boolean;
};

export type TeacherOption = {
  id: string;
  fullName: string;
};

export type EditUserModalProps = {
  user: EditableUser;
  allTeachers: TeacherOption[];
  scopedLoaTargetIds: string[];
  onClose: () => void;
  saveAction: (formData: FormData) => void;
};

// ─── Inline icons ─────────────────────────────────────────────────────────────

function CloseIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4 text-muted" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.45 4.39l4.26 4.26a.75.75 0 11-1.06 1.06l-4.26-4.26A7 7 0 012 9z"
        fill="currentColor"
      />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4 text-muted">
      <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── Toggle switch ────────────────────────────────────────────────────────────

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-[26px] w-[46px] shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 ${
        checked ? "bg-[var(--primary)]" : "bg-gray-200"
      }`}
    >
      <span
        className={`inline-block h-[20px] w-[20px] rounded-full bg-white shadow-sm transition-transform duration-200 ${
          checked ? "translate-x-[23px]" : "translate-x-[3px]"
        }`}
      />
    </button>
  );
}

// ─── Role options ─────────────────────────────────────────────────────────────

const ROLE_OPTIONS: { value: string; label: string }[] = [
  { value: "SUPER_ADMIN", label: "Super Admin" },
  { value: "ADMIN", label: "Administrator" },
  { value: "SLT", label: "Senior Leader" },
  { value: "HOD", label: "Head of Dept" },
  { value: "LEADER", label: "Leader" },
  { value: "TEACHER", label: "Teacher" },
  { value: "HR", label: "HR Officer" },
  { value: "ON_CALL", label: "On-Call Staff" },
];

// ─── Teacher search dropdown ──────────────────────────────────────────────────

function TeacherSearch({
  allTeachers,
  selectedIds,
  onAdd,
  placeholder,
}: {
  allTeachers: TeacherOption[];
  selectedIds: Set<string>;
  onAdd: (id: string) => void;
  placeholder: string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allTeachers.filter(
      (t) => !selectedIds.has(t.id) && (q === "" || t.fullName.toLowerCase().includes(q))
    );
  }, [query, allTeachers, selectedIds]);

  return (
    <div ref={ref} className="relative">
      <div className="flex items-center gap-2 rounded-xl border border-border bg-white px-3 py-2.5">
        <SearchIcon />
        <input
          type="text"
          className="w-full border-none bg-transparent text-sm text-text outline-none placeholder:text-muted/60"
          placeholder={placeholder}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
        />
      </div>
      {open && query.trim() !== "" && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-[180px] overflow-y-auto rounded-xl border border-border/80 bg-surface-container-lowest shadow-lg">
          {filtered.length === 0 ? (
            <p className="px-4 py-3 text-sm text-muted">No teachers found</p>
          ) : (
            filtered.map((t) => (
              <button
                key={t.id}
                type="button"
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-text calm-transition hover:bg-bg"
                onClick={() => {
                  onAdd(t.id);
                  setQuery("");
                  setOpen(false);
                }}
              >
                {t.fullName}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main modal ───────────────────────────────────────────────────────────────

export function EditUserModal({
  user,
  allTeachers,
  scopedLoaTargetIds,
  onClose,
  saveAction,
}: EditUserModalProps) {
  const [pending, startTransition] = useTransition();

  // Local state
  const [role, setRole] = useState(user.role);
  const [onCallRequests, setOnCallRequests] = useState(user.receivesOnCallEmails);
  const [leaveOfAbsence, setLeaveOfAbsence] = useState(user.canApproveAllLoa || scopedLoaTargetIds.length > 0);
  // UI-only toggles (no backend fields yet — shown per design spec)
  const [budgetaryApproval, setBudgetaryApproval] = useState(false);
  const [teacherObservations, setTeacherObservations] = useState(false);

  // Teacher observation scoping (UI-only — no backend fields yet)
  const [obsAllTeachers, setObsAllTeachers] = useState(false);
  const [obsTeacherIds, setObsTeacherIds] = useState<Set<string>>(new Set());

  const [loaAllTeachers, setLoaAllTeachers] = useState(user.canApproveAllLoa);
  const [loaTeacherIds, setLoaTeacherIds] = useState<Set<string>>(new Set(scopedLoaTargetIds));

  // Pre-compute teacher lookup for O(1) access
  const teacherById = useMemo(() => {
    const map = new Map<string, TeacherOption>();
    for (const t of allTeachers) map.set(t.id, t);
    return map;
  }, [allTeachers]);

  function handleSave() {
    const fd = new FormData();
    fd.set("userId", user.id);
    fd.set("role", role);
    fd.set("receivesOnCallEmails", String(onCallRequests));
    fd.set("canApproveAllLoa", String(leaveOfAbsence && loaAllTeachers));
    fd.set("scopedLoaTargetIds", leaveOfAbsence && !loaAllTeachers ? Array.from(loaTeacherIds).join(",") : "");

    startTransition(() => {
      saveAction(fd);
      onClose();
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.35)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="flex max-h-[90vh] w-full max-w-[480px] flex-col overflow-hidden rounded-2xl bg-white shadow-xl animate-in fade-in slide-in-from-bottom-3 duration-200">
        {/* ── Header ─────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <h2 className="text-[1.125rem] font-bold tracking-tight text-text">
            Edit User: {user.fullName}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="calm-transition rounded-md p-1.5 text-muted hover:bg-bg hover:text-text"
          >
            <CloseIcon />
          </button>
        </div>

        {/* ── Scrollable body ────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-6 pb-4">
          {/* Institutional Role */}
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
            Institutional Role
          </p>
          <div className="relative mt-2">
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="field w-full appearance-none pr-10"
            >
              {ROLE_OPTIONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
              <ChevronDownIcon />
            </span>
          </div>

          {/* ── Scoped Approvals ──────────────────────────────────── */}
          <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
            Scoped Approvals
          </p>
          <div className="mt-3 space-y-0 divide-y divide-border/40">
            {/* On-Call Requests */}
            <div className="flex items-center justify-between py-3">
              <span className="text-sm text-text">On-Call Requests</span>
              <Toggle checked={onCallRequests} onChange={setOnCallRequests} />
            </div>
            {/* Leave of Absence */}
            <div className="flex items-center justify-between py-3">
              <span className="text-sm text-text">Leave of Absence</span>
              <Toggle checked={leaveOfAbsence} onChange={setLeaveOfAbsence} />
            </div>
            {/* Budgetary Approval */}
            <div className="flex items-center justify-between py-3">
              <span className="text-sm text-text">Budgetary Approval</span>
              <Toggle checked={budgetaryApproval} onChange={setBudgetaryApproval} />
            </div>
            {/* Teacher Observations */}
            <div className="flex items-center justify-between py-3">
              <span className="text-sm text-text">Teacher Observations</span>
              <Toggle checked={teacherObservations} onChange={setTeacherObservations} />
            </div>
          </div>

          {/* ── Teacher Observation Scoping ────────────────────────── */}
          <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
            Teacher Observation Scoping
          </p>
          <div className="mt-3 flex items-center justify-between py-2">
            <span className="text-sm text-text">All Teachers</span>
            <Toggle checked={obsAllTeachers} onChange={setObsAllTeachers} />
          </div>
          {!obsAllTeachers && (
            <div className="mt-2">
              <TeacherSearch
                allTeachers={allTeachers}
                selectedIds={obsTeacherIds}
                onAdd={(id) => setObsTeacherIds((prev) => new Set(prev).add(id))}
                placeholder="Search and assign specific teachers..."
              />
            </div>
          )}

          {/* ── Leave of Absence Approval Scoping ─────────────────── */}
          <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
            Leave of Absence Approval Scoping
          </p>
          <div className="mt-3 flex items-center justify-between py-2">
            <span className="text-sm text-text">All Teachers</span>
            <Toggle
              checked={loaAllTeachers}
              onChange={(v) => {
                setLoaAllTeachers(v);
                if (v) setLoaTeacherIds(new Set());
              }}
            />
          </div>
          {!loaAllTeachers && (
            <div className="mt-2">
              <TeacherSearch
                allTeachers={allTeachers}
                selectedIds={loaTeacherIds}
                onAdd={(id) => setLoaTeacherIds((prev) => new Set(prev).add(id))}
                placeholder="Search and assign specific teachers..."
              />
              {/* Show assigned teachers as removable chips */}
              {loaTeacherIds.size > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {Array.from(loaTeacherIds).map((tid) => {
                    const teacher = teacherById.get(tid);
                    if (!teacher) return null;
                    return (
                      <span
                        key={tid}
                        className="inline-flex items-center gap-1 rounded-md bg-[var(--surface-container-low)] px-2 py-0.5 text-[12px] text-text"
                      >
                        {teacher.fullName}
                        <button
                          type="button"
                          className="ml-0.5 text-muted hover:text-text"
                          onClick={() =>
                            setLoaTeacherIds((prev) => {
                              const next = new Set(prev);
                              next.delete(tid);
                              return next;
                            })
                          }
                        >
                          ×
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Footer ─────────────────────────────────────────────── */}
        <div className="flex items-center justify-end gap-3 border-t border-border/40 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="px-5 py-2.5 text-sm font-medium text-text calm-transition hover:text-muted"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={pending}
            className="inline-flex items-center justify-center rounded-[0.75rem] bg-gradient-to-br from-[var(--primary)] to-[var(--primary-container)] px-6 py-2.5 text-sm font-semibold text-[var(--on-primary)] shadow-sm calm-transition hover:opacity-90 hover:shadow-md active:scale-[0.98] disabled:opacity-50"
          >
            {pending ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
