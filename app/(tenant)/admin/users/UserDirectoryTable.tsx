"use client";

import { useState, useMemo } from "react";
import { Avatar } from "@/components/ui/avatar";
import { EditUserModal, EditableUser, TeacherOption } from "./EditUserModal";

// ─── Types ────────────────────────────────────────────────────────────────────

type UserRow = {
  id: string;
  fullName: string;
  email: string;
  role: string;
  isActive: boolean;
  receivesOnCallEmails: boolean;
  canApproveAllLoa: boolean;
};

// ─── Inline icons ─────────────────────────────────────────────────────────────

function SearchIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5 text-muted" xmlns="http://www.w3.org/2000/svg">
      <path d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.45 4.39l4.26 4.26a.75.75 0 11-1.06 1.06l-4.26-4.26A7 7 0 012 9z" fill="currentColor" />
    </svg>
  );
}

function FilterIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 5h14M5 10h10M7 15h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function SortIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 6h14M3 10h10M3 14h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function ChevronLeftIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 4l-4 4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4" xmlns="http://www.w3.org/2000/svg">
      <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronsLeftIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4" xmlns="http://www.w3.org/2000/svg">
      <path d="M8 4l-4 4 4 4M12 4l-4 4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronsRightIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 4l4 4-4 4M8 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Administrator",
  SLT: "Senior Leader",
  HOD: "Head of Dept",
  LEADER: "Leader",
  TEACHER: "Teacher",
  HR: "HR Officer",
  ON_CALL: "On-Call Staff",
};

function roleLabel(role: string): string {
  return ROLE_LABELS[role] || role.charAt(0) + role.slice(1).toLowerCase();
}

function statusInfo(user: UserRow): { label: string; color: string; dotClass: string } {
  if (user.isActive) {
    return { label: "Active", color: "text-text", dotClass: "bg-emerald-500" };
  }
  return { label: "Inactive", color: "text-text", dotClass: "bg-gray-400" };
}

const PAGE_SIZE = 5;

// ─── Component ────────────────────────────────────────────────────────────────

export function UserDirectoryTable({
  users,
  allTeachers,
  scopedLoaByUser,
  saveAction,
}: {
  users: UserRow[];
  allTeachers: TeacherOption[];
  scopedLoaByUser: Record<string, string[]>;
  saveAction: (formData: FormData) => void;
}) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);

  // Filter users by search term
  const filtered = useMemo(() => {
    if (!search.trim()) return users;
    const q = search.toLowerCase();
    return users.filter(
      (u) =>
        u.fullName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        roleLabel(u.role).toLowerCase().includes(q)
    );
  }, [users, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * PAGE_SIZE;
  const pageUsers = filtered.slice(start, start + PAGE_SIZE);

  // Reset to page 1 when search changes
  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  // Generate page numbers to display
  function getPageNumbers(): (number | "ellipsis")[] {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages: (number | "ellipsis")[] = [];
    pages.push(1);
    if (safePage > 3) pages.push("ellipsis");
    for (let i = Math.max(2, safePage - 1); i <= Math.min(totalPages - 1, safePage + 1); i++) {
      pages.push(i);
    }
    if (safePage < totalPages - 2) pages.push("ellipsis");
    pages.push(totalPages);
    return pages;
  }

  return (
    <div className="space-y-0">
      {/* ── Search + Filter + Sort bar ──────────────────────────────── */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1">
          <span className="absolute left-4 top-1/2 -translate-y-1/2">
            <SearchIcon />
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search by name, email, or institutional role..."
            className="field w-full pl-11 pr-4"
          />
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-[0.75rem] border border-border px-5 py-2.5 text-sm font-medium text-text calm-transition hover:bg-[var(--surface-container-low)]"
        >
          <FilterIcon />
          Filter
        </button>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-[0.75rem] border border-border px-5 py-2.5 text-sm font-medium text-text calm-transition hover:bg-[var(--surface-container-low)]"
        >
          <SortIcon />
          Sort
        </button>
      </div>

      {/* ── Table ───────────────────────────────────────────────────── */}
      <div className="table-shell">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="table-head-row">
                <th className="px-5 py-3.5 text-left">Staff member</th>
                <th className="px-5 py-3.5 text-left">Institutional role</th>
                <th className="px-5 py-3.5 text-left">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageUsers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-12 text-center text-sm text-muted">
                    No users match your search.
                  </td>
                </tr>
              ) : (
                pageUsers.map((u) => {
                  const status = statusInfo(u);
                  return (
                    <tr key={u.id} className="table-row">
                      {/* Staff member */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar name={u.fullName} size="md" />
                          <div className="min-w-0">
                            <p className="truncate text-[13px] font-semibold leading-tight text-text">{u.fullName}</p>
                            <p className="truncate text-[12px] text-muted">{u.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Institutional role */}
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center rounded-md bg-[var(--surface-container-low)] px-2.5 py-1 text-[12px] font-medium text-text">
                          {roleLabel(u.role)}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span className={`inline-block h-2 w-2 rounded-full ${status.dotClass}`} />
                          <span className={`text-[13px] ${status.color}`}>{status.label}</span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => setEditingUser(u)}
                          className="text-[12px] font-bold uppercase tracking-[0.06em] text-text calm-transition hover:text-muted"
                        >
                          EDIT
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Pagination ──────────────────────────────────────────────── */}
      {filtered.length > 0 && (
        <div className="mt-5 flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-[13px] text-muted">
            Showing <span className="font-semibold text-text">{start + 1} - {Math.min(start + PAGE_SIZE, filtered.length)}</span>{" "}
            of <span className="font-semibold text-text">{filtered.length.toLocaleString()}</span> ledger entries
          </p>

          <div className="flex items-center gap-1">
            {/* First page */}
            <button
              type="button"
              onClick={() => setPage(1)}
              disabled={safePage === 1}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted calm-transition hover:bg-[var(--surface-container-low)] hover:text-text disabled:opacity-30 disabled:hover:bg-transparent"
              aria-label="First page"
            >
              <ChevronsLeftIcon />
            </button>

            {/* Previous page */}
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage === 1}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted calm-transition hover:bg-[var(--surface-container-low)] hover:text-text disabled:opacity-30 disabled:hover:bg-transparent"
              aria-label="Previous page"
            >
              <ChevronLeftIcon />
            </button>

            {/* Page numbers */}
            {getPageNumbers().map((p, idx) =>
              p === "ellipsis" ? (
                <span key={`e-${idx}`} className="inline-flex h-9 w-9 items-center justify-center text-[13px] text-muted">
                  …
                </span>
              ) : (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPage(p)}
                  className={`inline-flex h-9 w-9 items-center justify-center rounded-lg text-[13px] font-medium calm-transition ${
                    p === safePage
                      ? "bg-[var(--primary)] text-[var(--on-primary)]"
                      : "text-text hover:bg-[var(--surface-container-low)]"
                  }`}
                >
                  {p}
                </button>
              )
            )}

            {/* Next page */}
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted calm-transition hover:bg-[var(--surface-container-low)] hover:text-text disabled:opacity-30 disabled:hover:bg-transparent"
              aria-label="Next page"
            >
              <ChevronRightIcon />
            </button>

            {/* Last page */}
            <button
              type="button"
              onClick={() => setPage(totalPages)}
              disabled={safePage === totalPages}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted calm-transition hover:bg-[var(--surface-container-low)] hover:text-text disabled:opacity-30 disabled:hover:bg-transparent"
              aria-label="Last page"
            >
              <ChevronsRightIcon />
            </button>
          </div>
        </div>
      )}

      {/* ── Edit User Modal ─────────────────────────────────────── */}
      {editingUser && (
        <EditUserModal
          user={editingUser}
          allTeachers={allTeachers}
          scopedLoaTargetIds={scopedLoaByUser[editingUser.id] ?? []}
          onClose={() => setEditingUser(null)}
          saveAction={saveAction}
        />
      )}
    </div>
  );
}
