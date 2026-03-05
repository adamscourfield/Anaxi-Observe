import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/lib/admin";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { SectionHeader } from "@/components/ui/section-header";

export default async function AdminCoachingPage() {
  const user = await requireAdminUser();

  const allUsers = await (prisma as any).user.findMany({
    where: { tenantId: user.tenantId, isActive: true },
    orderBy: { fullName: "asc" },
    select: { id: true, fullName: true },
  });

  const assignments = await (prisma as any).coachAssignment.findMany({
    where: { tenantId: user.tenantId },
    include: {
      coach: { select: { id: true, fullName: true } },
      coachee: { select: { id: true, fullName: true } },
    },
    orderBy: [{ coachUserId: "asc" }],
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
      create: { tenantId: admin.tenantId, coachUserId, coacheeUserId },
    });
    revalidatePath("/tenant/admin/coaching");
  }

  async function removeAssignment(formData: FormData) {
    "use server";
    const admin = await requireAdminUser();
    const coachUserId = String(formData.get("coachUserId"));
    const coacheeUserId = String(formData.get("coacheeUserId"));
    await (prisma as any).coachAssignment.deleteMany({
      where: { tenantId: admin.tenantId, coachUserId, coacheeUserId },
    });
    revalidatePath("/tenant/admin/coaching");
  }

  const byCoach = new Map<string, { coach: any; coachees: any[] }>();
  for (const a of assignments as any[]) {
    if (!byCoach.has(a.coachUserId)) {
      byCoach.set(a.coachUserId, { coach: a.coach, coachees: [] });
    }
    byCoach.get(a.coachUserId)!.coachees.push(a.coachee);
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Coaching" subtitle="Manage coach-to-coachee assignment pairs." />

      <Card>
        <SectionHeader title="Create assignment" subtitle="Select a coach and coachee from active staff." />
        <form action={addAssignment} className="mt-3 grid max-w-2xl gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-[0.04em] text-muted">Coach</label>
            <select name="coachUserId" className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm" required>
              <option value="">Select coach…</option>
              {(allUsers as any[]).map((u: any) => (
                <option key={u.id} value={u.id}>{u.fullName}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-[0.04em] text-muted">Coachee</label>
            <select name="coacheeUserId" className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm" required>
              <option value="">Select coachee…</option>
              {(allUsers as any[]).map((u: any) => (
                <option key={u.id} value={u.id}>{u.fullName}</option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <Button type="submit">Add assignment</Button>
          </div>
        </form>
      </Card>

      <div className="space-y-3">
        {byCoach.size === 0 ? <EmptyState title="No coaching assignments yet" description="Create your first coach/coachee pair above." /> : null}

        {Array.from(byCoach.values()).map(({ coach, coachees }) => (
          <Card key={coach.id}>
            <SectionHeader title={coach.fullName} subtitle={`${coachees.length} coachee${coachees.length === 1 ? "" : "s"}`} />
            <ul className="mt-2 space-y-2">
              {coachees.map((coachee: any) => (
                <li key={coachee.id} className="flex items-center justify-between gap-2 rounded-lg border border-border/70 px-3 py-2 text-sm">
                  <span>{coachee.fullName}</span>
                  <form action={removeAssignment}>
                    <input type="hidden" name="coachUserId" value={coach.id} />
                    <input type="hidden" name="coacheeUserId" value={coachee.id} />
                    <Button type="submit" variant="ghost" className="px-2 py-1 text-xs">Remove</Button>
                  </form>
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </div>
  );
}
