import Link from "next/link";
import { getSessionUserOrThrow } from "@/lib/auth";
import { requireFeature } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { getTenantVocab } from "@/lib/vocab";
import { Card } from "@/components/ui/card";
import { H1, MetaText } from "@/components/ui/typography";

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
    ...(status ? { status } : {}),
  };

  const students = await (prisma as any).student.findMany({
    where,
    orderBy: { fullName: "asc" },
    take: 100,
    include: {
      snapshots: { orderBy: { snapshotDate: "desc" }, take: 1 },
      changeFlags: { where: { resolvedAt: null } },
    },
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <H1>Students</H1>
        <div className="flex gap-3 text-sm">
          <Link href="/tenant/students/import" className="text-accent hover:text-accentHover">Import snapshots</Link>
          <Link href="/tenant/students/import-subject-teachers" className="text-accent hover:text-accentHover">Import subject teachers</Link>
        </div>
      </div>

      <Card>
        <form className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-6">
          <input name="q" defaultValue={q} placeholder="Search name or UPN" className="rounded-md border border-border bg-bg/60 p-2" />
          <input name="yearGroup" defaultValue={yearGroup} placeholder="Year" className="rounded-md border border-border bg-bg/60 p-2" />
          <select name="send" defaultValue={send} className="rounded-md border border-border bg-bg/60 p-2"><option value="">SEND</option><option value="true">SEND Yes</option><option value="false">SEND No</option></select>
          <select name="pp" defaultValue={pp} className="rounded-md border border-border bg-bg/60 p-2"><option value="">PP</option><option value="true">PP Yes</option><option value="false">PP No</option></select>
          <select name="status" defaultValue={status} className="rounded-md border border-border bg-bg/60 p-2"><option value="">Status</option><option value="ACTIVE">Active</option><option value="ARCHIVED">Archived</option></select>
          <button className="rounded-md bg-primaryBtn px-3 py-2 text-sm font-semibold text-white hover:bg-primaryBtnHover">Apply filters</button>
        </form>
      </Card>

      <Card className="overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead className="bg-bg/60">
            <tr className="border-b border-border">
              <th className="p-3 text-left">UPN</th>
              <th className="p-3 text-left">Name</th>
              <th className="p-3 text-center">Year</th>
              <th className="p-3 text-center">Attendance</th>
              <th className="p-3 text-center">{vocab.detentions.plural}</th>
              <th className="p-3 text-center">Active flags</th>
            </tr>
          </thead>
          <tbody>
            {(students as any[]).map((s: any) => {
              const latest = s.snapshots?.[0];
              return (
                <tr key={s.id} className="border-b border-border/70 last:border-0 hover:bg-bg/40">
                  <td className="p-3">{s.upn}</td>
                  <td className="p-3"><Link className="text-accent hover:text-accentHover" href={`/tenant/students/${s.id}`}>{s.fullName}</Link></td>
                  <td className="p-3 text-center">{s.yearGroup || "-"}</td>
                  <td className="p-3 text-center">{latest ? String(latest.attendancePct) : "-"}</td>
                  <td className="p-3 text-center">{latest ? latest.detentionsCount : "-"}</td>
                  <td className="p-3 text-center">{s.changeFlags?.length || 0}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      <MetaText>Showing up to 100 students. Refine filters to narrow this list.</MetaText>
    </div>
  );
}
