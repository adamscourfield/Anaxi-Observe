import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/lib/admin";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { SectionHeader } from "@/components/ui/section-header";
import { Avatar } from "@/components/ui/avatar";
import { StatusPill } from "@/components/ui/status-pill";
import { StatCard } from "@/components/ui/stat-card";

// ─── Inline icons ─────────────────────────────────────────────────────────────

function KeyIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 1a4 4 0 00-3.46 6.02L2 11.56V14h2.44l.56-.56v-1.38h1.38l.56-.56V10h1.38l.64-.64A4 4 0 1010 1z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="11" cy="4" r="1" fill="currentColor" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

// ─── Role pill mapping ────────────────────────────────────────────────────────

const rolePillVariant: Record<string, "accent" | "info" | "warning" | "error"> = {
  TEACHER: "accent",
  LEADER: "info",
  SLT: "warning",
  ADMIN: "error",
};

export default async function AdminUsersPage() {
  const user = await requireAdminUser();
  const users = await (prisma as any).user.findMany({ where: { tenantId: user.tenantId }, orderBy: { fullName: "asc" } });
  const scopes = await (prisma as any).lOAApprovalScope.findMany({ where: { tenantId: user.tenantId } });

  const scopedByApprover = new Map<string, Set<string>>();
  for (const scope of scopes as any[]) {
    if (!scopedByApprover.has(scope.approverId)) scopedByApprover.set(scope.approverId, new Set());
    scopedByApprover.get(scope.approverId)!.add(scope.targetUserId);
  }

  // ── Computed stats ──────────────────────────────────────────────────────────
  const allUsers = users as any[];
  const activeCount = allUsers.filter((u) => u.isActive).length;
  const inactiveCount = allUsers.length - activeCount;
  const roleCounts = allUsers.reduce((acc: Record<string, number>, u: any) => {
    acc[u.role] = (acc[u.role] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const roleBreakdown = Object.entries(roleCounts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([role, count]) => `${count} ${role.charAt(0) + role.slice(1).toLowerCase()}${count !== 1 ? "s" : ""}`)
    .join(", ");

  // ── Server actions ──────────────────────────────────────────────────────────

  async function createUser(formData: FormData) {
    "use server";
    const admin = await requireAdminUser();
    const fullName = String(formData.get("fullName") || "");
    const email = String(formData.get("email") || "").toLowerCase();
    const role = String(formData.get("role") || "TEACHER") as any;
    const password = String(formData.get("password") || "Password123!");
    const hash = await bcrypt.hash(password, 10);
    await (prisma as any).user.create({
      data: {
        tenantId: admin.tenantId,
        fullName,
        email,
        role,
        passwordHash: hash,
        isActive: true,
        canApproveAllLoa: false,
        receivesOnCallEmails: false,
      },
    });
    revalidatePath("/admin/users");
  }

  async function toggleActive(formData: FormData) {
    "use server";
    const admin = await requireAdminUser();
    const id = String(formData.get("id"));
    const active = String(formData.get("active")) === "true";
    await (prisma as any).user.updateMany({ where: { id, tenantId: admin.tenantId }, data: { isActive: !active } });
    revalidatePath("/admin/users");
  }

  async function resetPassword(formData: FormData) {
    "use server";
    const admin = await requireAdminUser();
    const id = String(formData.get("id"));
    const password = String(formData.get("password") || "Password123!");
    const hash = await bcrypt.hash(password, 10);
    await (prisma as any).user.updateMany({ where: { id, tenantId: admin.tenantId }, data: { passwordHash: hash } });
    revalidatePath("/admin/users");
  }

  async function toggleApproveAllLoa(formData: FormData) {
    "use server";
    const admin = await requireAdminUser();
    const id = String(formData.get("id"));
    const enabled = String(formData.get("enabled")) === "true";
    await (prisma as any).user.updateMany({ where: { id, tenantId: admin.tenantId }, data: { canApproveAllLoa: !enabled } });
    revalidatePath("/admin/users");
  }

  async function toggleOnCallEmail(formData: FormData) {
    "use server";
    const admin = await requireAdminUser();
    const id = String(formData.get("id"));
    const enabled = String(formData.get("enabled")) === "true";
    await (prisma as any).user.updateMany({ where: { id, tenantId: admin.tenantId }, data: { receivesOnCallEmails: !enabled } });
    revalidatePath("/admin/users");
  }

  async function addScopedLoaApprover(formData: FormData) {
    "use server";
    const admin = await requireAdminUser();
    const approverId = String(formData.get("approverId") || "");
    const targetUserId = String(formData.get("targetUserId") || "");
    if (!approverId || !targetUserId || approverId === targetUserId) return;

    await (prisma as any).lOAApprovalScope.upsert({
      where: {
        tenantId_approverId_targetUserId: {
          tenantId: admin.tenantId,
          approverId,
          targetUserId,
        },
      },
      update: {},
      create: { tenantId: admin.tenantId, approverId, targetUserId },
    });
    revalidatePath("/admin/users");
  }

  async function removeScopedLoaApprover(formData: FormData) {
    "use server";
    const admin = await requireAdminUser();
    const approverId = String(formData.get("approverId") || "");
    const targetUserId = String(formData.get("targetUserId") || "");
    await (prisma as any).lOAApprovalScope.deleteMany({ where: { tenantId: admin.tenantId, approverId, targetUserId } });
    revalidatePath("/admin/users");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        subtitle="Manage staff accounts, roles, permissions, and leave-of-absence approval scope."
        actions={
          <Link href="/admin/users/import">
            <Button variant="secondary" type="button">Import users</Button>
          </Link>
        }
      />

      {/* ── Summary stats ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total staff" value={allUsers.length} context={roleBreakdown} />
        <StatCard label="Active" value={activeCount} accent="success" />
        <StatCard label="Inactive" value={inactiveCount} accent="warning" />
        <StatCard label="Admins & SLT" value={(roleCounts["ADMIN"] || 0) + (roleCounts["SLT"] || 0)} accent="info" />
      </div>

      {/* ── Create user ────────────────────────────────────────────── */}
      <Card>
        <SectionHeader title="Create user" subtitle="Add a new staff member with a temporary password." />
        <form action={createUser} className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.04em] text-muted">Full name</label>
            <input name="fullName" placeholder="e.g. Jane Smith" className="field w-full" required />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.04em] text-muted">Email</label>
            <input name="email" type="email" placeholder="jane@school.edu" className="field w-full" required />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.04em] text-muted">Role</label>
            <select name="role" className="field w-full">
              <option value="TEACHER">Teacher</option>
              <option value="LEADER">Leader</option>
              <option value="SLT">SLT</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.04em] text-muted">Temporary password</label>
            <input name="password" type="password" placeholder="••••••••" className="field w-full" required />
          </div>
          <div className="sm:col-span-2 lg:col-span-4">
            <Button type="submit">Create user</Button>
          </div>
        </form>
      </Card>

      {/* ── User list ──────────────────────────────────────────────── */}
      {allUsers.length === 0 ? (
        <EmptyState title="No users yet" description="Create a user manually or import users from a CSV file." />
      ) : (
        <div className="table-shell">
          {/* table header strip */}
          <div className="table-header-strip">
            <p className="text-[13px] font-medium text-text">
              {allUsers.length} staff member{allUsers.length !== 1 ? "s" : ""}
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="table-head-row">
                  <th className="px-4 py-3 text-left">Staff member</th>
                  <th className="px-4 py-3 text-left">Role</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-center">LOA&nbsp;(all)</th>
                  <th className="px-4 py-3 text-center">On-call</th>
                  <th className="px-4 py-3 text-left">Scoped LOA approvals</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {allUsers.map((u: any) => {
                  const scoped = Array.from(scopedByApprover.get(u.id) || []);
                  return (
                    <tr key={u.id} className="table-row align-top">
                      {/* ── Staff member (avatar + name + email) ─── */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar name={u.fullName} size="md" />
                          <div className="min-w-0">
                            <p className="truncate text-[13px] font-semibold leading-tight text-text">{u.fullName}</p>
                            <p className="truncate text-[12px] text-muted">{u.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* ── Role ────────────────────────────────── */}
                      <td className="px-4 py-3">
                        <StatusPill variant={rolePillVariant[u.role] || "neutral"} size="sm">{u.role}</StatusPill>
                      </td>

                      {/* ── Status ──────────────────────────────── */}
                      <td className="px-4 py-3 text-center">
                        <StatusPill variant={u.isActive ? "success" : "neutral"} size="sm">
                          {u.isActive ? "Active" : "Inactive"}
                        </StatusPill>
                      </td>

                      {/* ── LOA (all) toggle ───────────────────── */}
                      <td className="px-4 py-3 text-center">
                        <form action={toggleApproveAllLoa} className="inline-flex">
                          <input type="hidden" name="id" value={u.id} />
                          <input type="hidden" name="enabled" value={String(u.canApproveAllLoa)} />
                          <button
                            type="submit"
                            className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold calm-transition ${
                              u.canApproveAllLoa
                                ? "bg-[var(--pill-success-bg)] text-[var(--pill-success-text)] ring-1 ring-inset ring-[var(--pill-success-ring)]"
                                : "bg-[var(--pill-neutral-bg)] text-[var(--pill-neutral-text)] ring-1 ring-inset ring-[var(--pill-neutral-ring)]"
                            } hover:opacity-80`}
                            title={u.canApproveAllLoa ? "Click to revoke" : "Click to grant"}
                          >
                            {u.canApproveAllLoa ? "✓" : "–"}
                          </button>
                        </form>
                      </td>

                      {/* ── On-call toggle ─────────────────────── */}
                      <td className="px-4 py-3 text-center">
                        <form action={toggleOnCallEmail} className="inline-flex">
                          <input type="hidden" name="id" value={u.id} />
                          <input type="hidden" name="enabled" value={String(u.receivesOnCallEmails)} />
                          <button
                            type="submit"
                            className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold calm-transition ${
                              u.receivesOnCallEmails
                                ? "bg-[var(--pill-success-bg)] text-[var(--pill-success-text)] ring-1 ring-inset ring-[var(--pill-success-ring)]"
                                : "bg-[var(--pill-neutral-bg)] text-[var(--pill-neutral-text)] ring-1 ring-inset ring-[var(--pill-neutral-ring)]"
                            } hover:opacity-80`}
                            title={u.receivesOnCallEmails ? "Click to disable" : "Click to enable"}
                          >
                            {u.receivesOnCallEmails ? "✓" : "–"}
                          </button>
                        </form>
                      </td>

                      {/* ── Scoped LOA approvals ───────────────── */}
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {scoped.map((targetUserId) => {
                            const target = allUsers.find((x) => x.id === targetUserId);
                            return (
                              <form key={targetUserId} action={removeScopedLoaApprover} className="group inline-flex">
                                <input type="hidden" name="approverId" value={u.id} />
                                <input type="hidden" name="targetUserId" value={targetUserId} />
                                <button
                                  type="submit"
                                  className="inline-flex items-center gap-1 rounded-full bg-[var(--pill-info-bg)] px-2.5 py-1 text-[11px] font-medium text-[var(--pill-info-text)] ring-1 ring-inset ring-[var(--pill-info-ring)] calm-transition hover:bg-red-50 hover:text-red-600 hover:ring-red-200"
                                  title={`Remove ${target?.fullName || targetUserId}`}
                                >
                                  <span className="max-w-[100px] truncate">{target?.fullName || targetUserId}</span>
                                  <span className="opacity-50 group-hover:opacity-100"><XIcon /></span>
                                </button>
                              </form>
                            );
                          })}
                          <form action={addScopedLoaApprover} className="inline-flex items-center gap-1.5">
                            <input type="hidden" name="approverId" value={u.id} />
                            <select name="targetUserId" className="h-7 min-w-0 max-w-[130px] rounded-full border border-dashed border-border bg-transparent px-2 text-[11px] text-muted focus:border-accent focus:ring-1 focus:ring-accent/30">
                              <option value="">+ Add…</option>
                              {allUsers
                                .filter((staff: any) => staff.id !== u.id && !scoped.includes(staff.id))
                                .map((staff: any) => <option key={staff.id} value={staff.id}>{staff.fullName}</option>)}
                            </select>
                            <button type="submit" className="hidden" />
                          </form>
                        </div>
                      </td>

                      {/* ── Actions ─────────────────────────────── */}
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Reset password */}
                          <form action={resetPassword} className="flex items-center gap-1">
                            <input type="hidden" name="id" value={u.id} />
                            <input
                              name="password"
                              placeholder="New pw"
                              className="h-7 w-[80px] rounded-md border border-border bg-bg px-2 text-[11px] focus:border-accent focus:ring-1 focus:ring-accent/30"
                            />
                            <button
                              type="submit"
                              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted calm-transition hover:bg-bg hover:text-text"
                              title="Reset password"
                            >
                              <KeyIcon />
                            </button>
                          </form>

                          {/* Toggle active */}
                          <form action={toggleActive}>
                            <input type="hidden" name="id" value={u.id} />
                            <input type="hidden" name="active" value={String(u.isActive)} />
                            <button
                              type="submit"
                              className={`rounded-md px-2.5 py-1.5 text-[11px] font-medium calm-transition ${
                                u.isActive
                                  ? "text-muted hover:bg-red-50 hover:text-red-600"
                                  : "text-muted hover:bg-emerald-50 hover:text-emerald-600"
                              }`}
                              title={u.isActive ? "Deactivate user" : "Activate user"}
                            >
                              {u.isActive ? "Deactivate" : "Activate"}
                            </button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
