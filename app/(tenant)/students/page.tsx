import Link from "next/link";
import { getSessionUserOrThrow } from "@/lib/auth";
import { requireFeature } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { getTenantVocab } from "@/lib/vocab";

export default async function StudentsPage({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  const user = await getSessionUserOrThrow();
  await requireFeature(user.tenantId, "STUDENTS");
  const vocab = await getTenantVocab(user.tenantId);

  const q = searchParams.q || "";
  const yearGroup = searchParams.yearGroup || "";
  const send = searchParams.send || "";
  const pp = searchParams.pp || "";
  const status = searchParams.status || "";

  const where: any = {
    tenantId: user.tenantId,
    ...(q ? { OR: [{ fullName: { contains: q, mode: "insensitive" } }, { upn: { contains: q, mode: "insensitive" } }] } : {}),
    ...(yearGroup ? { yearGroup } : {}),
    ...(send ? { sendFlag: send === "true" } : {}),
    ...(pp ? { ppFlag: pp === "true" } : {}),
    ...(status ? { status } : {})
  };

  const students = await (prisma as any).student.findMany({
    where,
    orderBy: { fullName: "asc" },
    take: 100,
    include: {
      snapshots: { orderBy: { snapshotDate: "desc" }, take: 1 },
      changeFlags: { where: { resolvedAt: null } }
    }
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Students</h1>
        <div className="flex gap-2 text-sm">
          <Link href="/tenant/students/import" className="underline">Import snapshots</Link>
          <Link href="/tenant/students/import-subject-teachers" className="underline">Import subject teachers</Link>
        </div>
      </div>

      <form className="grid grid-cols-6 gap-2 rounded border bg-white p-3">
        <input name="q" defaultValue={q} placeholder="Search name or UPN" className="col-span-2 border p-2" />
        <input name="yearGroup" defaultValue={yearGroup} placeholder="Year" className="border p-2" />
        <select name="send" defaultValue={send} className="border p-2"><option value="">SEND</option><option value="true">SEND Yes</option><option value="false">SEND No</option></select>
        <select name="pp" defaultValue={pp} className="border p-2"><option value="">PP</option><option value="true">PP Yes</option><option value="false">PP No</option></select>
        <select name="status" defaultValue={status} className="border p-2"><option value="">Status</option><option value="ACTIVE">Active</option><option value="ARCHIVED">Archived</option></select>
      </form>

      <table className="w-full border bg-white text-sm">
        <thead><tr className="border-b"><th className="p-2 text-left">UPN</th><th className="p-2 text-left">Name</th><th className="p-2">Year</th><th className="p-2">Attendance</th><th className="p-2">{vocab.detentions.plural}</th><th className="p-2">Active flags</th></tr></thead>
        <tbody>
          {(students as any[]).map((s: any) => {
            const latest = s.snapshots?.[0];
            return (
              <tr key={s.id} className="border-b">
                <td className="p-2">{s.upn}</td>
                <td className="p-2"><Link className="underline" href={`/tenant/students/${s.id}`}>{s.fullName}</Link></td>
                <td className="p-2 text-center">{s.yearGroup || "-"}</td>
                <td className="p-2 text-center">{latest ? String(latest.attendancePct) : "-"}</td>
                <td className="p-2 text-center">{latest ? latest.detentionsCount : "-"}</td>
                <td className="p-2 text-center">{s.changeFlags?.length || 0}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
