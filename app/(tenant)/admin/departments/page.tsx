import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/lib/admin";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { SectionHeader } from "@/components/ui/section-header";

export default async function AdminDepartmentsPage() {
  const user = await requireAdminUser();

  const departments = await (prisma as any).department.findMany({
    where: { tenantId: user.tenantId },
    orderBy: { name: "asc" },
    include: {
      memberships: {
        include: { user: { select: { id: true, fullName: true } } },
      },
    },
  });

  const allUsers = await (prisma as any).user.findMany({
    where: { tenantId: user.tenantId, isActive: true },
    orderBy: { fullName: "asc" },
    select: { id: true, fullName: true },
  });

  async function createDepartment(formData: FormData) {
    "use server";
    const admin = await requireAdminUser();
    const name = String(formData.get("name") || "").trim();
    if (!name) return;
    await (prisma as any).department.upsert({
      where: { tenantId_name: { tenantId: admin.tenantId, name } },
      update: {},
      create: { tenantId: admin.tenantId, name },
    });
    revalidatePath("/tenant/admin/departments");
  }

  async function deleteDepartment(formData: FormData) {
    "use server";
    const admin = await requireAdminUser();
    const id = String(formData.get("id"));
    await (prisma as any).department.deleteMany({ where: { id, tenantId: admin.tenantId } });
    revalidatePath("/tenant/admin/departments");
  }

  async function addMember(formData: FormData) {
    "use server";
    const admin = await requireAdminUser();
    const departmentId = String(formData.get("departmentId"));
    const userId = String(formData.get("userId") || "");
    if (!userId) return;
    const dept = await (prisma as any).department.findFirst({ where: { id: departmentId, tenantId: admin.tenantId } });
    if (!dept) return;
    await (prisma as any).departmentMembership.upsert({
      where: { departmentId_userId: { departmentId, userId } },
      update: {},
      create: { tenantId: admin.tenantId, departmentId, userId, isHeadOfDepartment: false },
    });
    revalidatePath("/tenant/admin/departments");
  }

  async function removeMember(formData: FormData) {
    "use server";
    const admin = await requireAdminUser();
    const departmentId = String(formData.get("departmentId"));
    const userId = String(formData.get("userId"));
    const dept = await (prisma as any).department.findFirst({ where: { id: departmentId, tenantId: admin.tenantId } });
    if (!dept) return;
    await (prisma as any).departmentMembership.deleteMany({ where: { departmentId, userId } });
    revalidatePath("/tenant/admin/departments");
  }

  async function toggleHod(formData: FormData) {
    "use server";
    const admin = await requireAdminUser();
    const departmentId = String(formData.get("departmentId"));
    const userId = String(formData.get("userId"));
    const current = String(formData.get("current")) === "true";
    const dept = await (prisma as any).department.findFirst({ where: { id: departmentId, tenantId: admin.tenantId } });
    if (!dept) return;
    await (prisma as any).departmentMembership.updateMany({
      where: { departmentId, userId },
      data: { isHeadOfDepartment: !current },
    });
    revalidatePath("/tenant/admin/departments");
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Departments" subtitle="Manage departments, membership, and head-of-department assignments." />

      <Card>
        <SectionHeader title="Create department" subtitle="Add a department before assigning staff members." />
        <form action={createDepartment} className="mt-3 flex max-w-lg gap-2">
          <input name="name" placeholder="Department name (e.g. English)" className="flex-1 rounded-lg border border-border bg-bg px-3 py-2 text-sm" required />
          <Button type="submit">Add</Button>
        </form>
      </Card>

      <div className="space-y-3">
        {(departments as any[]).length === 0 ? (
          <EmptyState title="No departments yet" description="Create a department to start assigning staff and HODs." />
        ) : null}

        {(departments as any[]).map((dept: any) => {
          const memberIds = new Set<string>((dept.memberships as any[]).map((m: any) => m.userId));
          return (
            <Card key={dept.id}>
              <div className="mb-3 flex items-start justify-between gap-3">
                <SectionHeader title={dept.name} subtitle={`${dept.memberships.length} member${dept.memberships.length === 1 ? "" : "s"}`} />
                <form action={deleteDepartment}>
                  <input type="hidden" name="id" value={dept.id} />
                  <Button type="submit" variant="ghost" className="text-xs">Delete</Button>
                </form>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-bg/40 text-left text-xs uppercase tracking-[0.04em] text-muted">
                      <th className="p-2">Staff member</th>
                      <th className="p-2 text-center">HOD</th>
                      <th className="p-2 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(dept.memberships as any[]).map((m: any) => (
                      <tr key={m.userId} className="border-b border-border/70 last:border-0">
                        <td className="p-2">{m.user?.fullName}</td>
                        <td className="p-2 text-center">
                          <form action={toggleHod}>
                            <input type="hidden" name="departmentId" value={dept.id} />
                            <input type="hidden" name="userId" value={m.userId} />
                            <input type="hidden" name="current" value={String(m.isHeadOfDepartment)} />
                            <Button variant="ghost" className="px-2 py-1 text-xs" type="submit">{m.isHeadOfDepartment ? "Yes" : "No"}</Button>
                          </form>
                        </td>
                        <td className="p-2 text-right">
                          <form action={removeMember}>
                            <input type="hidden" name="departmentId" value={dept.id} />
                            <input type="hidden" name="userId" value={m.userId} />
                            <Button type="submit" variant="ghost" className="px-2 py-1 text-xs">Remove</Button>
                          </form>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <form action={addMember} className="mt-3 flex gap-2">
                <input type="hidden" name="departmentId" value={dept.id} />
                <select name="userId" className="flex-1 rounded-lg border border-border bg-bg px-3 py-2 text-sm">
                  <option value="">Add staff member…</option>
                  {(allUsers as any[])
                    .filter((u: any) => !memberIds.has(u.id))
                    .map((u: any) => (
                      <option key={u.id} value={u.id}>{u.fullName}</option>
                    ))}
                </select>
                <Button type="submit" variant="secondary">Add</Button>
              </form>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
