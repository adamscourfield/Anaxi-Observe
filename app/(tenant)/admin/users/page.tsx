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

export default async function AdminUsersPage() {
  const user = await requireAdminUser();
  const users = await (prisma as any).user.findMany({ where: { tenantId: user.tenantId }, orderBy: { createdAt: "desc" } });
  const scopes = await (prisma as any).lOAApprovalScope.findMany({ where: { tenantId: user.tenantId } });

  const scopedByApprover = new Map<string, Set<string>>();
  for (const scope of scopes as any[]) {
    if (!scopedByApprover.has(scope.approverId)) scopedByApprover.set(scope.approverId, new Set());
    scopedByApprover.get(scope.approverId)!.add(scope.targetUserId);
  }

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
    revalidatePath("/tenant/admin/users");
  }

  async function toggleActive(formData: FormData) {
    "use server";
    const admin = await requireAdminUser();
    const id = String(formData.get("id"));
    const active = String(formData.get("active")) === "true";
    await (prisma as any).user.updateMany({ where: { id, tenantId: admin.tenantId }, data: { isActive: !active } });
    revalidatePath("/tenant/admin/users");
  }

  async function resetPassword(formData: FormData) {
    "use server";
    const admin = await requireAdminUser();
    const id = String(formData.get("id"));
    const password = String(formData.get("password") || "Password123!");
    const hash = await bcrypt.hash(password, 10);
    await (prisma as any).user.updateMany({ where: { id, tenantId: admin.tenantId }, data: { passwordHash: hash } });
    revalidatePath("/tenant/admin/users");
  }

  async function toggleApproveAllLoa(formData: FormData) {
    "use server";
    const admin = await requireAdminUser();
    const id = String(formData.get("id"));
    const enabled = String(formData.get("enabled")) === "true";
    await (prisma as any).user.updateMany({ where: { id, tenantId: admin.tenantId }, data: { canApproveAllLoa: !enabled } });
    revalidatePath("/tenant/admin/users");
  }

  async function toggleOnCallEmail(formData: FormData) {
    "use server";
    const admin = await requireAdminUser();
    const id = String(formData.get("id"));
    const enabled = String(formData.get("enabled")) === "true";
    await (prisma as any).user.updateMany({ where: { id, tenantId: admin.tenantId }, data: { receivesOnCallEmails: !enabled } });
    revalidatePath("/tenant/admin/users");
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
    revalidatePath("/tenant/admin/users");
  }

  async function removeScopedLoaApprover(formData: FormData) {
    "use server";
    const admin = await requireAdminUser();
    const approverId = String(formData.get("approverId") || "");
    const targetUserId = String(formData.get("targetUserId") || "");
    await (prisma as any).lOAApprovalScope.deleteMany({ where: { tenantId: admin.tenantId, approverId, targetUserId } });
    revalidatePath("/tenant/admin/users");
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Users"
        subtitle="Manage staff access, account status, LOA approval scope, and on-call notification preferences."
        actions={
          <Link href="/tenant/admin/users/import">
            <Button variant="secondary" type="button">Import users</Button>
          </Link>
        }
      />

      <Card>
        <SectionHeader title="Create user" subtitle="Create an account with a temporary password and role." />
        <form action={createUser} className="mt-3 grid gap-3 sm:grid-cols-2">
          <input name="fullName" placeholder="Full name" className="rounded-lg border border-border bg-bg px-3 py-2 text-sm" required />
          <input name="email" placeholder="Email" type="email" className="rounded-lg border border-border bg-bg px-3 py-2 text-sm" required />
          <select name="role" className="rounded-lg border border-border bg-bg px-3 py-2 text-sm">
            <option>TEACHER</option><option>LEADER</option><option>SLT</option><option>ADMIN</option>
          </select>
          <input name="password" placeholder="Temporary password" className="rounded-lg border border-border bg-bg px-3 py-2 text-sm" required />
          <div className="sm:col-span-2">
            <Button type="submit">Create user</Button>
          </div>
        </form>
      </Card>

      <Card className="overflow-hidden p-0">
        {(users as any[]).length === 0 ? (
          <div className="p-4">
            <EmptyState title="No users yet" description="Create a user manually or import users from CSV." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-bg/60 text-left text-xs uppercase tracking-[0.05em] text-muted">
                  <th className="p-2">Name</th>
                  <th className="p-2">Email</th>
                  <th className="p-2 text-center">Role</th>
                  <th className="p-2 text-center">Active</th>
                  <th className="p-2 text-center">LOA all</th>
                  <th className="p-2 text-center">On-call emails</th>
                  <th className="p-2">LOA scoped approvals</th>
                  <th className="p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(users as any[]).map((u: any) => {
                  const scoped = Array.from(scopedByApprover.get(u.id) || []);
                  return (
                    <tr key={u.id} className="border-b border-border/70 align-top last:border-0">
                      <td className="p-2">{u.fullName}</td>
                      <td className="p-2">{u.email}</td>
                      <td className="p-2 text-center">{u.role}</td>
                      <td className="p-2 text-center">{u.isActive ? "Yes" : "No"}</td>
                      <td className="p-2 text-center">
                        <form action={toggleApproveAllLoa}>
                          <input type="hidden" name="id" value={u.id} />
                          <input type="hidden" name="enabled" value={String(u.canApproveAllLoa)} />
                          <Button variant="ghost" className="px-2 py-1 text-xs" type="submit">{u.canApproveAllLoa ? "Yes" : "No"}</Button>
                        </form>
                      </td>
                      <td className="p-2 text-center">
                        <form action={toggleOnCallEmail}>
                          <input type="hidden" name="id" value={u.id} />
                          <input type="hidden" name="enabled" value={String(u.receivesOnCallEmails)} />
                          <Button variant="ghost" className="px-2 py-1 text-xs" type="submit">{u.receivesOnCallEmails ? "Yes" : "No"}</Button>
                        </form>
                      </td>
                      <td className="p-2">
                        <div className="space-y-2">
                          {scoped.map((targetUserId) => {
                            const target = (users as any[]).find((x) => x.id === targetUserId);
                            return (
                              <form key={targetUserId} action={removeScopedLoaApprover} className="flex items-center justify-between gap-2 rounded-lg border border-border/70 px-2 py-1.5">
                                <input type="hidden" name="approverId" value={u.id} />
                                <input type="hidden" name="targetUserId" value={targetUserId} />
                                <span className="truncate">{target?.fullName || targetUserId}</span>
                                <Button variant="ghost" className="px-2 py-1 text-xs" type="submit">Remove</Button>
                              </form>
                            );
                          })}
                          <form action={addScopedLoaApprover} className="flex gap-2">
                            <input type="hidden" name="approverId" value={u.id} />
                            <select name="targetUserId" className="min-w-0 flex-1 rounded-lg border border-border bg-bg px-2 py-1.5 text-sm">
                              <option value="">Add staff...</option>
                              {(users as any[])
                                .filter((staff: any) => staff.id !== u.id)
                                .map((staff: any) => <option key={staff.id} value={staff.id}>{staff.fullName}</option>)}
                            </select>
                            <Button variant="secondary" className="px-3 py-1.5 text-xs" type="submit">Add</Button>
                          </form>
                        </div>
                      </td>
                      <td className="p-2">
                        <div className="flex flex-col gap-2">
                          <form action={toggleActive}>
                            <input type="hidden" name="id" value={u.id} />
                            <input type="hidden" name="active" value={String(u.isActive)} />
                            <Button variant="secondary" className="w-full px-3 py-1.5 text-xs" type="submit">{u.isActive ? "Deactivate" : "Activate"}</Button>
                          </form>
                          <form action={resetPassword} className="flex gap-2">
                            <input type="hidden" name="id" value={u.id} />
                            <input name="password" placeholder="New password" className="min-w-0 flex-1 rounded-lg border border-border bg-bg px-2 py-1.5 text-xs" />
                            <Button variant="ghost" className="px-2 py-1 text-xs" type="submit">Reset</Button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
