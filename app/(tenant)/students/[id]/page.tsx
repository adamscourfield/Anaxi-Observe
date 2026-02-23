import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionUserOrThrow } from "@/lib/auth";

export default async function StudentDetailPage({ params }: { params: { id: string } }) {
  const user = await getSessionUserOrThrow();
  const student = await (prisma as any).student.findFirst({
    where: { id: params.id, tenantId: user.tenantId },
    include: {
      snapshots: { orderBy: { snapshotDate: "asc" } },
      subjects: { include: { subject: true, teacher: true }, where: { OR: [{ effectiveTo: null }, { effectiveTo: { gt: new Date() } }] } },
      changeFlags: { orderBy: { createdAt: "desc" }, take: 50 },
      onCallRequests: { orderBy: { createdAt: "desc" }, take: 20, include: { location: true, reason: true } }
    }
  });
  if (!student) notFound();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{student.fullName}</h1>
        <p className="text-sm">UPN {student.upn} · Year {student.yearGroup || "-"} · SEND {student.sendFlag ? "Yes" : "No"} · PP {student.ppFlag ? "Yes" : "No"} · {student.status}</p>
      </div>

      <section className="rounded border bg-white p-4">
        <h2 className="mb-2 font-medium">Teachers by subject (current)</h2>
        <ul className="list-disc pl-5 text-sm">
          {(student.subjects as any[]).map((x: any) => <li key={x.id}>{x.subject?.name}: {x.teacher?.fullName} ({x.teacher?.email})</li>)}
        </ul>
      </section>

      <section className="rounded border bg-white p-4">
        <h2 className="mb-2 font-medium">Trends (snapshot history)</h2>
        <table className="w-full text-sm">
          <thead><tr className="border-b"><th className="p-2 text-left">Date</th><th className="p-2">Attendance</th><th className="p-2">Detentions</th><th className="p-2">On Calls</th><th className="p-2">Lateness</th></tr></thead>
          <tbody>
            {(student.snapshots as any[]).map((s: any) => (
              <tr key={s.id} className="border-b"><td className="p-2">{new Date(s.snapshotDate).toISOString().slice(0,10)}</td><td className="p-2 text-center">{String(s.attendancePct)}</td><td className="p-2 text-center">{s.detentionsCount}</td><td className="p-2 text-center">{s.onCallsCount}</td><td className="p-2 text-center">{s.latenessCount}</td></tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="rounded border bg-white p-4">
        <h2 className="mb-2 font-medium">Flags</h2>
        <ul className="space-y-2 text-sm">
          {(student.changeFlags as any[]).map((f: any) => <li key={f.id}><strong>{f.flagKey}</strong> ({f.severity}) {f.resolvedAt ? "Resolved" : "Open"}</li>)}
        </ul>
      </section>

      <section className="rounded border bg-white p-4">
        <h2 className="mb-2 font-medium">On Call history</h2>
        <ul className="space-y-1 text-sm">
          {(student.onCallRequests as any[]).map((oc: any) => (
            <li key={oc.id}>
              {new Date(oc.createdAt).toISOString().slice(0,10)} · {oc.category} · {oc.status} · {oc.location?.label || oc.locationText || "-"} · {oc.reason?.label || "-"}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
