import { getSessionUserOrThrow } from "@/lib/auth";
import { requireFeature } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { createLoaRequest } from "../actions";

export default async function LeaveRequestPage() {
  const user = await getSessionUserOrThrow();
  await requireFeature(user.tenantId, "LEAVE");
  const reasons = await prisma.loaReason.findMany({
    where: { tenantId: user.tenantId, active: true },
    orderBy: { label: "asc" }
  });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Request Leave</h1>
      <form action={createLoaRequest} className="grid max-w-2xl grid-cols-2 gap-3 rounded border bg-white p-4">
        <label className="text-sm">Start</label>
        <input required type="datetime-local" name="startAt" className="border p-2" />

        <label className="text-sm">End</label>
        <input required type="datetime-local" name="endAt" className="border p-2" />

        <label className="col-span-2 text-sm">Reason</label>
        <select required name="reasonId" className="col-span-2 border p-2">
          <option value="">Select reason</option>
          {(reasons as any[]).map((reason: any) => (
            <option key={reason.id} value={reason.id}>{reason.label}</option>
          ))}
        </select>

        <label className="col-span-2 text-sm">Cover notes (optional)</label>
        <textarea name="coverNotes" className="col-span-2 border p-2" rows={4} />

        <button className="col-span-2 rounded bg-slate-900 px-3 py-2 text-white" type="submit">Submit request</button>
      </form>
    </div>
  );
}
