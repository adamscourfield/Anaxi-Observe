import Link from "next/link";
import { getSessionUserOrThrow } from "@/lib/auth";
import { requireFeature } from "@/lib/guards";
import { prisma } from "@/lib/prisma";

export default async function ObservationHistoryPage({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) {
  const user = await getSessionUserOrThrow();
  await requireFeature(user.tenantId, "OBSERVATIONS");

  const teacherId = String(searchParams?.teacherId || "");
  const subject = String(searchParams?.subject || "").trim();
  const yearGroup = String(searchParams?.yearGroup || "").trim();
  const observerId = String(searchParams?.observerId || "");
  const from = String(searchParams?.from || "");
  const to = String(searchParams?.to || "");

  const where: any = {
    tenantId: user.tenantId,
    ...(user.role === "TEACHER" ? { observedTeacherId: user.id } : {}),
    ...(teacherId && user.role !== "TEACHER" ? { observedTeacherId: teacherId } : {}),
    ...(subject ? { subject: { contains: subject, mode: "insensitive" } } : {}),
    ...(yearGroup ? { yearGroup } : {}),
    ...(observerId && user.role !== "TEACHER" ? { observerId } : {}),
    ...(from || to
      ? {
          observedAt: {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to ? { lte: new Date(to) } : {})
          }
        }
      : {})
  };

  const [teachers, observers, observations] = await Promise.all([
    (prisma as any).user.findMany({ where: { tenantId: user.tenantId, isActive: true }, orderBy: { fullName: "asc" } }),
    (prisma as any).user.findMany({ where: { tenantId: user.tenantId, isActive: true, role: { in: ["LEADER", "SLT", "ADMIN"] } }, orderBy: { fullName: "asc" } }),
    (prisma as any).observation.findMany({
      where,
      include: { observedTeacher: true, observer: true, signals: true },
      orderBy: { observedAt: "desc" },
      take: 100
    })
  ]);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Observation History</h1>

      <form className="grid max-w-5xl grid-cols-6 gap-2 rounded border bg-white p-3 text-sm">
        {user.role !== "TEACHER" ? (
          <>
            <select name="teacherId" defaultValue={teacherId} className="border p-2">
              <option value="">All teachers</option>
              {(teachers as any[]).map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.fullName}</option>)}
            </select>
            <select name="observerId" defaultValue={observerId} className="border p-2">
              <option value="">All observers</option>
              {(observers as any[]).map((observer) => <option key={observer.id} value={observer.id}>{observer.fullName}</option>)}
            </select>
          </>
        ) : null}
        <input name="subject" defaultValue={subject} placeholder="Subject" className="border p-2" />
        <input name="yearGroup" defaultValue={yearGroup} placeholder="Year group" className="border p-2" />
        <input name="from" type="date" defaultValue={from} className="border p-2" />
        <input name="to" type="date" defaultValue={to} className="border p-2" />
        <button className="rounded bg-slate-900 px-3 py-2 text-white" type="submit">Filter</button>
      </form>

      <ul className="space-y-2 rounded border bg-white p-4 text-sm">
        {(observations as any[]).map((observation) => (
          <li key={observation.id}>
            <Link className="underline" href={`/tenant/observe/${observation.id}`}>
              {new Date(observation.observedAt).toLocaleDateString()} · {observation.subject} · {observation.yearGroup} · {observation.observedTeacher?.fullName} · by {observation.observer?.fullName}
            </Link>
          </li>
        ))}
        {observations.length === 0 ? <li className="text-slate-600">No observations found.</li> : null}
      </ul>
    </div>
  );
}
