import { getSessionUserOrThrow } from "@/lib/auth";
import { requireFeature } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { createLoaRequest } from "../actions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";

export default async function LeaveRequestPage() {
  const user = await getSessionUserOrThrow();
  await requireFeature(user.tenantId, "LEAVE");
  const reasons = await prisma.loaReason.findMany({
    where: { tenantId: user.tenantId, active: true },
    orderBy: { label: "asc" }
  });

  return (
    <div className="space-y-5">
      <PageHeader title="Request leave" subtitle="Submit a leave request with dates, reason, and optional notes for cover." />
      <Card>
        <form action={createLoaRequest} className="grid max-w-2xl grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="text-sm text-muted">Start</label>
          <input required type="datetime-local" name="startAt" className="rounded-md border border-border bg-bg/60 p-2 text-sm text-text" />

          <label className="text-sm text-muted">End</label>
          <input required type="datetime-local" name="endAt" className="rounded-md border border-border bg-bg/60 p-2 text-sm text-text" />

          <label className="sm:col-span-2 text-sm text-muted">Reason</label>
          <select required name="reasonId" className="sm:col-span-2 rounded-md border border-border bg-bg/60 p-2 text-sm text-text">
            <option value="">Select reason</option>
            {(reasons as any[]).map((reason: any) => (
              <option key={reason.id} value={reason.id}>{reason.label}</option>
            ))}
          </select>

          <label className="sm:col-span-2 text-sm text-muted">Cover notes (optional)</label>
          <textarea name="coverNotes" className="sm:col-span-2 rounded-md border border-border bg-bg/60 p-2 text-sm text-text" rows={4} />

          <Button className="sm:col-span-2" type="submit">Submit request</Button>
        </form>
      </Card>
    </div>
  );
}
