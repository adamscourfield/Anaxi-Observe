import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/lib/admin";
import { revalidatePath } from "next/cache";

export default async function AdminDepartmentsPage() {
  const user = await requireAdminUser();

  const departments = await (prisma as any).department.findMany({
    where: { tenantId: user.tenantId },
    orderBy: { name: "asc" },
    include: {
      memberships: {
        include: { user: { select: { id: true, fullName: true } } }
      }
    }
  });

  const allUsers = await (prisma as any).user.findMany({
    where: { tenantId: user.tenantId, isActive: true },
    orderBy: { fullName: "asc" },
    select: { id: true, fullName: true }
  });

  async function createDepartment(formData: FormData) {
    "use server";
    const admin = await requireAdminUser();
    const name = String(formData.get("name") || "").trim();
    if (!name) return;
    await (prisma as any).department.upsert({
      where: { tenantId_name: { tenantId: admin.tenantId, name } },
      update: {},
      create: { tenantId: admin.tenantId, name }
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
      create: { tenantId: admin.tenantId, departmentId, userId, isHeadOfDepartment: false }
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
      data: { isHeadOfDepartment: !current }
    });
    revalidatePath("/tenant/admin/departments");
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Departments</h1>

      <form action={createDepartment} className="flex max-w-sm gap-2">
        <input name="name" placeholder="Department name (e.g. English)" className="flex-1 rounded border p-2 text-sm" required />
        <button type="submit" className="rounded bg-slate-900 px-4 py-2 text-sm text-white">
          Add
        </button>
      </form>

      <div className="space-y-4">
        {(departments as any[]).length === 0 && (
          <p className="text-sm text-slate-500">No departments yet.</p>
        )}
        {(departments as any[]).map((dept: any) => {
          const memberIds = new Set<string>((dept.memberships as any[]).map((m: any) => m.userId));
          return (
            <div key={dept.id} className="rounded border bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-semibold">{dept.name}</h2>
                <form action={deleteDepartment}>
                  <input type="hidden" name="id" value={dept.id} />
                  <button type="submit" className="text-sm text-red-600 underline">
                    Delete
                  </button>
                </form>
              </div>

              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="p-1 text-left">Staff member</th>
                    <th className="p-1 text-center">HOD</th>
                    <th className="p-1" />
                  </tr>
                </thead>
                <tbody>
                  {(dept.memberships as any[]).map((m: any) => (
                    <tr key={m.userId} className="border-b last:border-0">
                      <td className="p-1">{m.user?.fullName}</td>
                      <td className="p-1 text-center">
                        <form action={toggleHod}>
                          <input type="hidden" name="departmentId" value={dept.id} />
                          <input type="hidden" name="userId" value={m.userId} />
                          <input type="hidden" name="current" value={String(m.isHeadOfDepartment)} />
                          <button type="submit" className="underline">
                            {m.isHeadOfDepartment ? "Yes" : "No"}
                          </button>
                        </form>
                      </td>
                      <td className="p-1 text-right">
                        <form action={removeMember}>
                          <input type="hidden" name="departmentId" value={dept.id} />
                          <input type="hidden" name="userId" value={m.userId} />
                          <button type="submit" className="text-red-600 underline">
                            Remove
                          </button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <form action={addMember} className="mt-2 flex gap-2">
                <input type="hidden" name="departmentId" value={dept.id} />
                <select name="userId" className="flex-1 rounded border p-1 text-sm">
                  <option value="">Add staff member…</option>
                  {(allUsers as any[])
                    .filter((u: any) => !memberIds.has(u.id))
                    .map((u: any) => (
                      <option key={u.id} value={u.id}>{u.fullName}</option>
                    ))}
                </select>
                <button type="submit" className="rounded bg-slate-900 px-3 py-1 text-sm text-white">
                  Add
                </button>
              </form>
            </div>
          );
        })}
      </div>
    </div>
  );
}
