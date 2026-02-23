import Link from "next/link";
import { getSessionUserOrThrow } from "@/lib/auth";
import { requireFeature } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { getTenantVocab } from "@/lib/vocab";

export default async function OnCallFeedPage({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  const user = await getSessionUserOrThrow();
  await requireFeature(user.tenantId, "ON_CALL");
  const vocab = await getTenantVocab(user.tenantId);

  const status = searchParams.status || "";
  const yearGroup = searchParams.yearGroup || "";
  const emailError = searchParams.emailError || "";
  const start = new Date(); start.setHours(0,0,0,0);

  const requests = await (prisma as any).onCallRequest.findMany({
    where: {
      tenantId: user.tenantId,
      createdAt: { gte: start },
      ...(status ? { status } : {}),
      ...(yearGroup ? { student: { yearGroup } } : {})
    },
    include: { student: true, createdBy: true, location: true, reason: true },
    orderBy: { createdAt: "desc" },
    take: 200
  });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Today&apos;s {vocab.on_calls.plural} feed</h1>
      <form className="flex gap-2 rounded border bg-white p-3">
        <select name="status" defaultValue={status} className="border p-2">
          <option value="">All statuses</option><option value="SENT">SENT</option><option value="ACKNOWLEDGED">ACKNOWLEDGED</option><option value="RESOLVED">RESOLVED</option><option value="CANCELLED">CANCELLED</option>
        </select>
        <input name="yearGroup" defaultValue={yearGroup} placeholder="Year group" className="border p-2" />
        <button className="rounded bg-slate-900 px-3 py-2 text-white" type="submit">Filter</button>
      </form>

      <table className="w-full border bg-white text-sm">
        <thead><tr className="border-b"><th className="p-2 text-left">Time</th><th className="p-2 text-left">Student</th><th className="p-2">Category</th><th className="p-2 text-left">Location</th><th className="p-2 text-left">Reason</th><th className="p-2">Status</th></tr></thead>
        <tbody>
          {(requests as any[]).map((r: any) => (
            <tr key={r.id} className="border-b">
              <td className="p-2"><Link className="underline" href={`/tenant/on-call/${r.id}`}>{new Date(r.createdAt).toLocaleTimeString()}</Link></td>
              <td className="p-2">{r.student?.fullName} ({r.student?.yearGroup || "-"})</td>
              <td className="p-2 text-center">{r.category}</td>
              <td className="p-2">{r.location?.label || r.locationText || "-"}</td>
              <td className="p-2">{r.reason?.label || "-"}</td>
              <td className="p-2 text-center">{r.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
