"use client";

import { useState } from "react";
import { Avatar } from "@/components/ui/avatar";

type DeptMember = {
  userId: string;
  isHeadOfDepartment: boolean;
  user: { id: string; fullName: string };
};

type Department = {
  id: string;
  name: string;
  faculty: string | null;
  memberships: DeptMember[];
};

type User = { id: string; fullName: string };

type Props = {
  departments: Department[];
  allUsers: User[];
  deleteDepartmentAction: (formData: FormData) => void;
  addMemberAction: (formData: FormData) => void;
  removeMemberAction: (formData: FormData) => void;
  toggleHodAction: (formData: FormData) => void;
  renameDepartmentAction: (formData: FormData) => void;
};

export function DepartmentsAdminTable({
  departments,
  allUsers,
  deleteDepartmentAction,
  addMemberAction,
  removeMemberAction,
  toggleHodAction,
  renameDepartmentAction,
}: Props) {
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [editName, setEditName] = useState("");
  const [addingMemberDept, setAddingMemberDept] = useState<Department | null>(null);
  const [selectedUserId, setSelectedUserId] = useState("");

  function openEdit(dept: Department) {
    setEditingDept(dept);
    setEditName(dept.name);
  }

  function openAddMember(dept: Department) {
    setAddingMemberDept(dept);
    const existingIds = new Set(dept.memberships.map((m) => m.userId));
    const first = allUsers.find((u) => !existingIds.has(u.id));
    setSelectedUserId(first?.id ?? "");
  }

  return (
    <>
      <div className="table-shell">
        {/* Table head */}
        <div className="table-head-row grid grid-cols-[1fr_1fr_140px_120px] items-center px-6 py-3">
          <span>Department Name</span>
          <span>Head of Department (HOD)</span>
          <span className="text-center">Teacher Count</span>
          <span className="text-center">Actions</span>
        </div>

        {/* Table body */}
        {departments.map((dept) => {
          const hod = dept.memberships.find((m) => m.isHeadOfDepartment);

          return (
            <div key={dept.id} className="table-row grid grid-cols-[1fr_1fr_140px_120px] items-center px-6 py-4">
              <div>
                <p className="text-[15px] font-semibold text-text leading-tight">{dept.name}</p>
                {dept.faculty && (
                  <p className="mt-0.5 text-xs text-muted">Faculty: {dept.faculty}</p>
                )}
              </div>

              <div className="flex items-center gap-3">
                {hod ? (
                  <>
                    <Avatar name={hod.user?.fullName ?? "?"} size="md" />
                    <span className="text-sm text-text">{hod.user?.fullName}</span>
                  </>
                ) : (
                  <span className="text-sm text-muted italic">No HOD assigned</span>
                )}
              </div>

              <div className="text-center">
                <span className="text-sm font-medium text-text">{dept.memberships.length}</span>
              </div>

              <div className="flex items-center justify-center gap-2">
                {/* Edit department name */}
                <button
                  type="button"
                  onClick={() => openEdit(dept)}
                  className="rounded-md p-1.5 text-muted calm-transition hover:bg-[var(--surface-container-low)] hover:text-text"
                  title="Edit department"
                >
                  <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-9.07 9.07-3.87.968.968-3.87 9.144-9.143z" />
                  </svg>
                </button>

                {/* Add member */}
                <button
                  type="button"
                  onClick={() => openAddMember(dept)}
                  className="rounded-md p-1.5 text-muted calm-transition hover:bg-[var(--surface-container-low)] hover:text-text"
                  title="Add member to department"
                >
                  <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 18v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                    <circle cx="10" cy="6" r="3" />
                    <path d="M18 9l-2 2-2-2" />
                  </svg>
                </button>

                {/* Delete */}
                <form action={deleteDepartmentAction}>
                  <input type="hidden" name="id" value={dept.id} />
                  <button
                    type="submit"
                    className="rounded-md p-1.5 text-muted calm-transition hover:bg-error/10 hover:text-error"
                    title="Delete department"
                    onClick={(e) => {
                      if (!confirm(`Delete "${dept.name}"? This cannot be undone.`)) {
                        e.preventDefault();
                      }
                    }}
                  >
                    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 6h12M8 6V4h4v2M6 6v10a1 1 0 001 1h6a1 1 0 001-1V6" />
                    </svg>
                  </button>
                </form>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Edit Department Dialog ─────────────────────────────────────── */}
      {editingDept && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.35)" }}
          onClick={(e) => e.target === e.currentTarget && setEditingDept(null)}
        >
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-bold text-text mb-4">Edit Department</h2>
            <form
              action={renameDepartmentAction}
              onSubmit={() => setEditingDept(null)}
            >
              <input type="hidden" name="id" value={editingDept.id} />
              <label className="block text-[11px] font-semibold uppercase tracking-[0.1em] text-muted mb-1">
                Department Name
              </label>
              <input
                name="name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="field w-full"
                required
              />
              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingDept(null)}
                  className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted hover:text-text calm-transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary hover:opacity-90 calm-transition"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Add Member Dialog ──────────────────────────────────────────── */}
      {addingMemberDept && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.35)" }}
          onClick={(e) => e.target === e.currentTarget && setAddingMemberDept(null)}
        >
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-bold text-text mb-1">Add Member</h2>
            <p className="text-sm text-muted mb-4">Add a staff member to <strong>{addingMemberDept.name}</strong></p>
            <form
              action={addMemberAction}
              onSubmit={() => setAddingMemberDept(null)}
            >
              <input type="hidden" name="departmentId" value={addingMemberDept.id} />
              {(() => {
                const existingIds = new Set(addingMemberDept.memberships.map((m) => m.userId));
                const available = allUsers.filter((u) => !existingIds.has(u.id));
                return (
                  <>
                    <label className="block text-[11px] font-semibold uppercase tracking-[0.1em] text-muted mb-1">
                      Staff Member
                    </label>
                    <select
                      name="userId"
                      value={selectedUserId}
                      onChange={(e) => setSelectedUserId(e.target.value)}
                      className="field w-full"
                      required
                    >
                      <option value="">Select a staff member…</option>
                      {available.map((u) => (
                        <option key={u.id} value={u.id}>{u.fullName}</option>
                      ))}
                    </select>
                    {available.length === 0 && (
                      <p className="mt-2 text-sm text-muted">All staff are already members of this department.</p>
                    )}
                  </>
                );
              })()}
              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAddingMemberDept(null)}
                  className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted hover:text-text calm-transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary hover:opacity-90 calm-transition"
                >
                  Add
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
