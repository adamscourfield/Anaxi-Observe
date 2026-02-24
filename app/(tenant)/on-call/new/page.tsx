import { getSessionUserOrThrow } from "@/lib/auth";
import { requireFeature } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { getTenantVocab } from "@/lib/vocab";

export default async function OnCallNewPage() {
  const user = await getSessionUserOrThrow();
  await requireFeature(user.tenantId, "ON_CALL");

  const [vocab, students, reasons, locations] = await Promise.all([
    getTenantVocab(user.tenantId),
    (prisma as any).student.findMany({ where: { tenantId: user.tenantId, status: "ACTIVE" }, orderBy: { fullName: "asc" }, take: 200 }),
    (prisma as any).onCallReason.findMany({ where: { tenantId: user.tenantId, active: true }, orderBy: { label: "asc" } }),
    (prisma as any).onCallLocation.findMany({ where: { tenantId: user.tenantId, active: true }, orderBy: { label: "asc" } })
  ]);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Raise {vocab.on_calls.singular}</h1>
      <form action="/api/on-call/send" method="post" className="grid max-w-2xl grid-cols-2 gap-3 rounded border bg-white p-4">
        <label className="col-span-2 text-sm">Student</label>
        <select name="studentId" className="col-span-2 border p-2" required>
          <option value="">Select student</option>
          {(students as any[]).map((s: any) => <option key={s.id} value={s.id}>{s.fullName} ({s.upn})</option>)}
        </select>

        <label className="text-sm">Category</label>
        <select name="category" className="border p-2" required>
          <option value="BEHAVIOUR">Behaviour</option>
          <option value="FIRST_AID">First Aid</option>
        </select>

        <label className="text-sm">Location</label>
        <select name="locationId" className="border p-2">
          <option value="">Select location</option>
          {(locations as any[]).map((l: any) => <option key={l.id} value={l.id}>{l.label}</option>)}
        </select>

        <label className="col-span-2 text-sm">Location text (optional fallback)</label>
        <input name="locationText" className="col-span-2 border p-2" placeholder="e.g. Canteen near west doors" />

        <label className="col-span-2 text-sm">Behaviour reason (required for behaviour)</label>
        <select name="reasonId" className="col-span-2 border p-2">
          <option value="">Select reason</option>
          {(reasons as any[]).map((r: any) => <option key={r.id} value={r.id}>{r.label}</option>)}
        </select>

        <label className="col-span-2 text-sm">Notes</label>
        <textarea name="notes" className="col-span-2 border p-2" rows={4} />

        <button className="col-span-2 rounded bg-slate-900 px-3 py-2 text-white" type="submit">Send {vocab.on_calls.singular}</button>
      </form>
      <p className="text-xs text-slate-600">Tip: this form is optimized for fast raise in under 30 seconds.</p>
    </div>
  );
}
