import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/lib/admin";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Avatar } from "@/components/ui/avatar";

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

  const deptList = departments as any[];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Academic Departments"
        subtitle="Manage institutional hierarchy, departmental leadership, and resource allocation for the current academic year."
        actions={
          <div className="flex items-center gap-3">
            <Button type="button" variant="secondary" className="gap-2">
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 3v14M6 13l4 4 4-4" />
              </svg>
              Export Ledger
            </Button>
            <form action={createDepartment} className="flex items-center gap-2">
              <input
                name="name"
                placeholder="Department name…"
                className="rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/30 w-48"
                required
              />
              <Button type="submit" className="gap-2">
                <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M10 4v12M4 10h12" />
                </svg>
                New Department
              </Button>
            </form>
          </div>
        }
      />

      {deptList.length === 0 ? (
        <EmptyState title="No departments yet" description="Add your first department using the form above." />
      ) : (
        <div className="table-shell">
          {/* Table head */}
          <div className="table-head-row grid grid-cols-[1fr_1fr_140px_120px] items-center px-6 py-3">
            <span>Department Name</span>
            <span>Head of Department (HOD)</span>
            <span className="text-center">Teacher Count</span>
            <span className="text-center">Actions</span>
          </div>

          {/* Table body */}
          {deptList.map((dept: any) => {
            const hod = (dept.memberships as any[]).find((m: any) => m.isHeadOfDepartment);
            const memberIds = new Set<string>((dept.memberships as any[]).map((m: any) => m.userId));
            const addableUsers = (allUsers as any[]).filter((u: any) => !memberIds.has(u.id));

            return (
              <div key={dept.id} className="table-row grid grid-cols-[1fr_1fr_140px_120px] items-center px-6 py-4">
                {/* Department Name + Faculty */}
                <div>
                  <p className="text-[15px] font-semibold text-text leading-tight">{dept.name}</p>
                  {dept.faculty && (
                    <p className="mt-0.5 text-xs text-muted">Faculty: {dept.faculty}</p>
                  )}
                </div>

                {/* Head of Department */}
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

                {/* Teacher Count */}
                <div className="text-center">
                  <span className="text-sm font-medium text-text">{dept.memberships.length}</span>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-center gap-2">
                  {/* Toggle HOD (if there are members) */}
                  {hod ? (
                    <form action={toggleHod}>
                      <input type="hidden" name="departmentId" value={dept.id} />
                      <input type="hidden" name="userId" value={hod.userId} />
                      <input type="hidden" name="current" value="true" />
                      <button
                        type="submit"
                        className="rounded-md p-1.5 text-muted calm-transition hover:bg-[var(--surface-container-low)] hover:text-text"
                        title="Remove HOD role"
                      >
                        <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M13.586 3.586a2 2 0 112.828 2.828l-9.07 9.07-3.87.968.968-3.87 9.144-9.143z" />
                        </svg>
                      </button>
                    </form>
                  ) : (
                    <span className="p-1.5">
                      <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4 text-muted/40" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-9.07 9.07-3.87.968.968-3.87 9.144-9.143z" />
                      </svg>
                    </span>
                  )}

                  {/* Members management */}
                  <form action={addMember} className="flex items-center">
                    <input type="hidden" name="departmentId" value={dept.id} />
                    <input type="hidden" name="userId" value="" />
                    <button
                      type="button"
                      className="rounded-md p-1.5 text-muted calm-transition hover:bg-[var(--surface-container-low)] hover:text-text"
                      title={`${dept.memberships.length} member${dept.memberships.length !== 1 ? "s" : ""}`}
                    >
                      <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M16 18v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                        <circle cx="10" cy="6" r="3" />
                        <path d="M18 9l-2 2-2-2" />
                      </svg>
                    </button>
                  </form>

                  {/* Delete */}
                  <form action={deleteDepartment}>
                    <input type="hidden" name="id" value={dept.id} />
                    <button
                      type="submit"
                      className="rounded-md p-1.5 text-muted calm-transition hover:bg-error/10 hover:text-error"
                      title="Delete department"
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

          {/* Footer with count */}
          <div className="flex items-center justify-between border-t border-[var(--surface-container-low)] px-6 py-3">
            <p className="text-sm text-muted">
              Showing <span className="font-semibold text-text">{deptList.length}</span> department{deptList.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
