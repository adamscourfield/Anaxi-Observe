import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/lib/admin";
import { revalidatePath } from "next/cache";

export default async function AdminCoachingPage() {
  const user = await requireAdminUser();

  const allUsers = await (prisma as any).user.findMany({
    where: { tenantId: user.tenantId, isActive: true },
    orderBy: { fullName: "asc" },
    select: { id: true, fullName: true }
  });

  const assignments = await (prisma as any).coachAssignment.findMany({
    where: { tenantId: user.tenantId },
    include: {
      coach: { select: { id: true, fullName: true } },
      coachee: { select: { id: true, fullName: true } }
    },
    orderBy: [{ coachUserId: "asc" }]
  });

  async function addAssignment(formData: FormData) {
    "use server";
    const admin = await requireAdminUser();
    const coachUserId = String(formData.get("coachUserId") || "");
    const coacheeUserId = String(formData.get("coacheeUserId") || "");
    if (!coachUserId || !coacheeUserId || coachUserId === coacheeUserId) return;
    await (prisma as any).coachAssignment.upsert({
      where: { tenantId_coachUserId_coacheeUserId: { tenantId: admin.tenantId, coachUserId, coacheeUserId } },
      update: {},
      create: { tenantId: admin.tenantId, coachUserId, coacheeUserId }
    });
    revalidatePath("/tenant/admin/coaching");
  }

  async function removeAssignment(formData: FormData) {
    "use server";
    const admin = await requireAdminUser();
    const coachUserId = String(formData.get("coachUserId"));
    const coacheeUserId = String(formData.get("coacheeUserId"));
    await (prisma as any).coachAssignment.deleteMany({
      where: { tenantId: admin.tenantId, coachUserId, coacheeUserId }
    });
    revalidatePath("/tenant/admin/coaching");
  }

  // Group assignments by coach for display
  const byCoach = new Map<string, { coach: any; coachees: any[] }>();
  for (const a of assignments as any[]) {
    if (!byCoach.has(a.coachUserId)) {
      byCoach.set(a.coachUserId, { coach: a.coach, coachees: [] });
    }
    byCoach.get(a.coachUserId)!.coachees.push(a.coachee);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Coaching Assignments</h1>

      <form action={addAssignment} className="grid max-w-lg grid-cols-2 gap-2">
        <div>
          <label className="mb-1 block text-xs text-slate-600">Coach</label>
          <select name="coachUserId" className="w-full rounded border p-2 text-sm" required>
            <option value="">Select coach…</option>
            {(allUsers as any[]).map((u: any) => (
              <option key={u.id} value={u.id}>{u.fullName}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-600">Coachee</label>
          <select name="coacheeUserId" className="w-full rounded border p-2 text-sm" required>
            <option value="">Select coachee…</option>
            {(allUsers as any[]).map((u: any) => (
              <option key={u.id} value={u.id}>{u.fullName}</option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="col-span-2 rounded bg-slate-900 px-4 py-2 text-sm text-white"
        >
          Add assignment
        </button>
      </form>

      <div className="space-y-4">
        {byCoach.size === 0 && (
          <p className="text-sm text-slate-500">No coaching assignments yet.</p>
        )}
        {Array.from(byCoach.values()).map(({ coach, coachees }) => (
          <div key={coach.id} className="rounded border bg-white p-4 shadow-sm">
            <h2 className="mb-2 font-semibold">{coach.fullName}</h2>
            <ul className="space-y-1">
              {coachees.map((coachee: any) => (
                <li key={coachee.id} className="flex items-center justify-between text-sm">
                  <span>{coachee.fullName}</span>
                  <form action={removeAssignment}>
                    <input type="hidden" name="coachUserId" value={coach.id} />
                    <input type="hidden" name="coacheeUserId" value={coachee.id} />
                    <button type="submit" className="text-red-600 underline">Remove</button>
                  </form>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
