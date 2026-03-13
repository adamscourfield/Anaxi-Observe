import Link from "next/link";
import { getSessionUserOrThrow } from "@/lib/auth";
import { requireFeature } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { getTenantVocab } from "@/lib/vocab";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MetaText } from "@/components/ui/typography";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusPill } from "@/components/ui/status-pill";

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

  const activeFilters = [q && `Search: ${q}`, yearGroup && `Year ${yearGroup}`, send && `SEND ${send === "true" ? "Yes" : "No"}`, pp && `PP ${pp === "true" ? "Yes" : "No"}`, status && status].filter(Boolean);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Culture · Student overview"
        title="Students"
        subtitle="Monitor attendance, behaviour trends, and active flags across cohorts."
        meta={
          <>
            <StatusPill variant="info">Up to 100 records</StatusPill>
            <StatusPill variant="neutral">{students.length} shown</StatusPill>
            {activeFilters.length > 0 ? <StatusPill variant="accent">{activeFilters.length} active filter{activeFilters.length !== 1 ? "s" : ""}</StatusPill> : null}
          </>
        }
        actions={
          <>
            <Link href="/students/import" className="rounded-xl border border-border/70 bg-bg/20 px-3.5 py-2 text-sm text-muted hover:bg-divider/60 hover:text-text">Import snapshots</Link>
            <Link href="/students/import-subject-teachers" className="rounded-xl border border-border/70 bg-bg/20 px-3.5 py-2 text-sm text-muted hover:bg-divider/60 hover:text-text">Import subject teachers</Link>
          </>
        }
      />

      <Card className="premium-toolbar p-4">
        <form className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1.5fr)_repeat(4,minmax(0,1fr))_auto]">
          <input name="q" defaultValue={q} placeholder="Search name or UPN" className="rounded-xl border border-border/70 bg-bg/45 px-3 py-2.5 text-sm text-text placeholder:text-muted" />
          <input name="yearGroup" defaultValue={yearGroup} placeholder="Year" className="rounded-xl border border-border/70 bg-bg/45 px-3 py-2.5 text-sm text-text placeholder:text-muted" />
          <select name="send" defaultValue={send} className="rounded-xl border border-border/70 bg-bg/45 px-3 py-2.5 text-sm text-text"><option value="">SEND</option><option value="true">SEND Yes</option><option value="false">SEND No</option></select>
          <select name="pp" defaultValue={pp} className="rounded-xl border border-border/70 bg-bg/45 px-3 py-2.5 text-sm text-text"><option value="">PP</option><option value="true">PP Yes</option><option value="false">PP No</option></select>
          <select name="status" defaultValue={status} className="rounded-xl border border-border/70 bg-bg/45 px-3 py-2.5 text-sm text-text"><option value="">Status</option><option value="ACTIVE">Active</option><option value="ARCHIVED">Archived</option></select>
          <div className="flex items-center gap-2 xl:justify-end">
            <Button type="submit">Apply</Button>
            <Link href="/students" className="rounded-xl border border-border/70 bg-bg/20 px-3.5 py-2.5 text-sm text-muted hover:bg-divider/60 hover:text-text">Reset</Link>
          </div>
        </form>
      </Card>

      <Card className="table-shell p-0">
        <div className="table-header-strip">
          <div>
            <p className="text-sm font-semibold text-text">Student register</p>
            <MetaText className="mt-1">Attendance, behaviour trend, and active flag scan for the current filter set.</MetaText>
          </div>
          <StatusPill variant="neutral">{students.length} result{students.length !== 1 ? "s" : ""}</StatusPill>
        </div>
        {(students as any[]).length === 0 ? (
          <div className="p-4">
            <EmptyState mode="embedded" title="No students found" description="Try broadening your filters or import a recent snapshot." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="table-head-row">
                <tr>
                  <th className="p-3 text-left">Student</th>
                  <th className="p-3 text-left">UPN</th>
                  <th className="p-3 text-center">Year</th>
                  <th className="p-3 text-center">Attendance</th>
                  <th className="p-3 text-center">{vocab.detentions.plural}</th>
                  <th className="p-3 text-center">Flags</th>
                </tr>
              </thead>
              <tbody>
                {(students as any[]).map((s: any) => {
                  const latest = s.snapshots?.[0];
                  const flagCount = s.changeFlags?.length || 0;
                  return (
                    <tr key={s.id} className="table-row">
                      <td className="p-3">
                        <div className="flex flex-col gap-1">
                          <Link className="font-medium text-accent hover:text-accentHover" href={`/students/${s.id}`}>{s.fullName}</Link>
                          <div className="flex flex-wrap gap-1.5">
                            {s.sendFlag ? <StatusPill variant="info" size="sm">SEND</StatusPill> : null}
                            {s.ppFlag ? <StatusPill variant="accent" size="sm">PP</StatusPill> : null}
                            {s.status === "ARCHIVED" ? <StatusPill variant="neutral" size="sm">Archived</StatusPill> : null}
                          </div>
                        </div>
                      </td>
                      <td className="p-3 text-muted">{s.upn}</td>
                      <td className="p-3 text-center text-text">{s.yearGroup || "-"}</td>
                      <td className="p-3 text-center text-text">{latest ? `${Number(latest.attendancePct).toFixed(1)}%` : "-"}</td>
                      <td className="p-3 text-center text-text">{latest ? latest.detentionsCount : "-"}</td>
                      <td className="p-3 text-center">
                        {flagCount > 0 ? <StatusPill variant={flagCount >= 3 ? "warning" : "neutral"}>{flagCount} active</StatusPill> : <span className="text-muted">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <MetaText>Showing up to 100 students. Refine filters to narrow this list.</MetaText>
    </div>
  );
}
