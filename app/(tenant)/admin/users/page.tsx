import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/lib/admin";
import { revalidatePath } from "next/cache";

export default async function AdminUsersPage() {
  const user = await requireAdminUser();
  const users = await prisma.user.findMany({ where: { tenantId: user.tenantId }, orderBy: { createdAt: "desc" } });

  async function createUser(formData: FormData) {
    "use server";
    const admin = await requireAdminUser();
    const fullName = String(formData.get("fullName") || "");
    const email = String(formData.get("email") || "").toLowerCase();
    const role = String(formData.get("role") || "TEACHER") as any;
    const password = String(formData.get("password") || "Password123!");
    const hash = await bcrypt.hash(password, 10);
    await prisma.user.create({ data: { tenantId: admin.tenantId, fullName, email, role, passwordHash: hash, isActive: true } });
    revalidatePath("/tenant/admin/users");
  }

  async function toggleActive(formData: FormData) {
    "use server";
    const admin = await requireAdminUser();
    const id = String(formData.get("id"));
    const active = String(formData.get("active")) === "true";
    await prisma.user.updateMany({ where: { id, tenantId: admin.tenantId }, data: { isActive: !active } });
    revalidatePath("/tenant/admin/users");
  }

  async function resetPassword(formData: FormData) {
    "use server";
    const admin = await requireAdminUser();
    const id = String(formData.get("id"));
    const password = String(formData.get("password") || "Password123!");
    const hash = await bcrypt.hash(password, 10);
    await prisma.user.updateMany({ where: { id, tenantId: admin.tenantId }, data: { passwordHash: hash } });
    revalidatePath("/tenant/admin/users");
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Users</h1>
      <form action={createUser} className="grid max-w-2xl grid-cols-2 gap-2">
        <input name="fullName" placeholder="Full name" className="border p-2" required />
        <input name="email" placeholder="Email" type="email" className="border p-2" required />
        <select name="role" className="border p-2">
          <option>TEACHER</option><option>LEADER</option><option>SLT</option><option>ADMIN</option>
        </select>
        <input name="password" placeholder="Temporary password" className="border p-2" required />
        <button type="submit" className="col-span-2 rounded bg-slate-900 px-3 py-2 text-white">Create user</button>
      </form>
      <table className="w-full border bg-white text-sm">
        <thead><tr className="border-b"><th className="p-2 text-left">Name</th><th className="p-2 text-left">Email</th><th className="p-2">Role</th><th className="p-2">Active</th><th className="p-2">Actions</th></tr></thead>
        <tbody>
          {(users as any[]).map((u: any) => (
            <tr key={u.id} className="border-b align-top">
              <td className="p-2">{u.fullName}</td>
              <td className="p-2">{u.email}</td>
              <td className="p-2 text-center">{u.role}</td>
              <td className="p-2 text-center">{u.isActive ? "Yes" : "No"}</td>
              <td className="p-2">
                <div className="flex flex-col gap-2">
                  <form action={toggleActive}>
                    <input type="hidden" name="id" value={u.id} />
                    <input type="hidden" name="active" value={String(u.isActive)} />
                    <button className="underline" type="submit">{u.isActive ? "Deactivate" : "Activate"}</button>
                  </form>
                  <form action={resetPassword} className="flex gap-2">
                    <input type="hidden" name="id" value={u.id} />
                    <input name="password" placeholder="New password" className="border p-1" />
                    <button className="underline" type="submit">Reset password</button>
                  </form>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
