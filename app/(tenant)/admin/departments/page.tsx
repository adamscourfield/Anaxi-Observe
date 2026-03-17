import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/lib/admin";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Avatar } from "@/components/ui/avatar";
import { StatusPill } from "@/components/ui/status-pill";

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
    revalidatePath("/admin/departments");
  }

  async function deleteDepartment(formData: FormData) {
    "use server";
    const admin = await requireAdminUser();
    const id = String(formData.get("id"));
    await (prisma as any).department.deleteMany({ where: { id, tenantId: admin.tenantId } });
    revalidatePath("/admin/departments");
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
    revalidatePath("/admin/departments");
  }

  async function removeMember(formData: FormData) {
    "use server";
    const admin = await requireAdminUser();
    const departmentId = String(formData.get("departmentId"));
    const userId = String(formData.get("userId"));
    const dept = await (prisma as any).department.findFirst({ where: { id: departmentId, tenantId: admin.tenantId } });
    if (!dept) return;
    await (prisma as any).departmentMembership.deleteMany({ where: { departmentId, userId } });
    revalidatePath("/admin/departments");
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
    revalidatePath("/admin/departments");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Departments"
        subtitle="Organise staff into departments and assign heads of department."
        actions={
          <form action={createDepartment} className="flex items-center gap-2">
            <input
              name="name"
              placeholder="New department name…"
              className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/30 w-52"
              required
            />
            <Button type="submit">Add department</Button>
          </form>
        }
      />

      {(departments as any[]).length === 0 ? (
        <EmptyState title="No departments yet" description="Add your first department using the form above." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(departments as any[]).map((dept: any) => {
            const memberIds = new Set<string>((dept.memberships as any[]).map((m: any) => m.userId));
            const hod = (dept.memberships as any[]).find((m: any) => m.isHeadOfDepartment);
            const addableUsers = (allUsers as any[]).filter((u: any) => !memberIds.has(u.id));

            return (
              <Card key={dept.id} className="flex flex-col gap-4">
                {/* Department header */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[15px] font-semibold text-text leading-tight">{dept.name}</p>
                    <p className="mt-0.5 text-xs text-muted">
                      {dept.memberships.length} member{dept.memberships.length !== 1 ? "s" : ""}
                      {hod ? ` · HOD: ${hod.user?.fullName}` : ""}
                    </p>
                  </div>
                  <form action={deleteDepartment}>
                    <input type="hidden" name="id" value={dept.id} />
                    <button
                      type="submit"
                      className="rounded-md p-1 text-muted calm-transition hover:bg-error/10 hover:text-error"
                      title="Delete department"
                    >
                      <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4" xmlns="http://www.w3.org/2000/svg">
                        <path d="M3 4h10M6 4V2.5h4V4M5.5 4v8h5V4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  </form>
                </div>

                {/* Member list */}
                {dept.memberships.length > 0 ? (
                  <ul className="space-y-2">
                    {(dept.memberships as any[]).map((m: any) => (
                      <li key={m.userId} className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <Avatar name={m.user?.fullName ?? "?"} size="sm" />
                          <span className="truncate text-sm text-text">{m.user?.fullName}</span>
                          {m.isHeadOfDepartment && (
                            <StatusPill variant="accent" size="sm">HOD</StatusPill>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <form action={toggleHod}>
                            <input type="hidden" name="departmentId" value={dept.id} />
                            <input type="hidden" name="userId" value={m.userId} />
                            <input type="hidden" name="current" value={String(m.isHeadOfDepartment)} />
                            <button
                              type="submit"
                              className="rounded-md px-2 py-0.5 text-[11px] font-medium text-muted calm-transition hover:bg-bg hover:text-text border border-transparent hover:border-border"
                              title={m.isHeadOfDepartment ? "Remove HOD role" : "Make HOD"}
                            >
                              {m.isHeadOfDepartment ? "Remove HOD" : "Make HOD"}
                            </button>
                          </form>
                          <form action={removeMember}>
                            <input type="hidden" name="departmentId" value={dept.id} />
                            <input type="hidden" name="userId" value={m.userId} />
                            <button
                              type="submit"
                              className="rounded-md p-1 text-muted calm-transition hover:bg-error/10 hover:text-error"
                              title="Remove from department"
                            >
                              <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg">
                                <path d="M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                              </svg>
                            </button>
                          </form>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-muted italic">No members yet</p>
                )}

                {/* Add member */}
                {addableUsers.length > 0 && (
                  <form action={addMember} className="flex items-center gap-2 border-t border-border/60 pt-3 mt-auto">
                    <input type="hidden" name="departmentId" value={dept.id} />
                    <select name="userId" className="min-w-0 flex-1 rounded-lg border border-border bg-bg px-2 py-1.5 text-sm text-text">
                      <option value="">Add staff member…</option>
                      {addableUsers.map((u: any) => (
                        <option key={u.id} value={u.id}>{u.fullName}</option>
                      ))}
                    </select>
                    <Button type="submit" variant="secondary" className="shrink-0 px-3 py-1.5 text-xs">Add</Button>
                  </form>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
