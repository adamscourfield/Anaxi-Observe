import Link from "next/link";
import { getSessionUserOrThrow } from "@/lib/auth";
import { requireFeature } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusPill } from "@/components/ui/status-pill";
import { Avatar } from "@/components/ui/avatar";

export default async function StudentsPage({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  const user = await getSessionUserOrThrow();
  await requireFeature(user.tenantId, "STUDENTS");

  const q = searchParams.q || "";
  const yearGroup = searchParams.yearGroup || "";
  const send = searchParams.send || "";
  const pp = searchParams.pp || "";

  const where: Record<string, unknown> = {
    tenantId: user.tenantId,
    status: "ACTIVE",
    ...(q ? { OR: [{ fullName: { contains: q, mode: "insensitive" } }, { upn: { contains: q, mode: "insensitive" } }] } : {}),
    ...(yearGroup ? { yearGroup } : {}),
    ...(send ? { sendFlag: send === "true" } : {}),
    ...(pp ? { ppFlag: pp === "true" } : {}),
  };

  const [students, distinctYearGroups] = await Promise.all([
    (prisma as any).student.findMany({
      where,
      orderBy: { fullName: "asc" },
      take: 100,
      include: {
        snapshots: { orderBy: { snapshotDate: "desc" }, take: 1 },
      },
    }),
    (prisma as any).student.findMany({
      where: { tenantId: user.tenantId, status: "ACTIVE" },
      distinct: ["yearGroup"],
      select: { yearGroup: true },
      orderBy: { yearGroup: "asc" },
    }),
  ]);

  const yearGroups: string[] = (distinctYearGroups as { yearGroup: string | null }[])
    .map((r) => r.yearGroup)
    .filter((v): v is string => Boolean(v));

  const hasFilters = !!(q || yearGroup || send || pp);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Students"
        subtitle={`${(students as unknown[]).length} student${(students as unknown[]).length === 1 ? "" : "s"} shown${hasFilters ? " (filtered)" : ""}`}
        actions={
          <div className="flex items-center gap-2">
            <Link href="/students/import">
              <Button variant="secondary">Import snapshots</Button>
            </Link>
            <Link href="/students/import-subject-teachers">
              <Button variant="secondary">Import subject teachers</Button>
            </Link>
          </div>
        }
      />

      <Card className="p-4">
        <form className="flex flex-wrap items-center gap-2" method="get">
          <input
            name="q"
            defaultValue={q}
            placeholder="Search by name or UPN…"
            className="min-w-[180px] flex-1 rounded-lg border border-border bg-white px-3 py-2 text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
          <select
            name="yearGroup"
            defaultValue={yearGroup}
            className="rounded-lg border border-border bg-white px-3 py-2 text-sm text-text"
          >
            <option value="">All years</option>
            {yearGroups.map((yg) => (
              <option key={yg} value={yg}>{yg}</option>
            ))}
          </select>
          <select
            name="send"
            defaultValue={send}
            className="rounded-lg border border-border bg-white px-3 py-2 text-sm text-text"
          >
            <option value="">SEND</option>
            <option value="true">SEND Yes</option>
            <option value="false">SEND No</option>
          </select>
          <select
            name="pp"
            defaultValue={pp}
            className="rounded-lg border border-border bg-white px-3 py-2 text-sm text-text"
          >
            <option value="">PP</option>
            <option value="true">PP Yes</option>
            <option value="false">PP No</option>
          </select>
          <Button type="submit">Apply</Button>
          {hasFilters && (
            <Link href="/students">
              <Button type="button" variant="ghost">Clear</Button>
            </Link>
          )}
        </form>
      </Card>

      {(students as unknown[]).length === 0 ? (
        <EmptyState
          title="No students found"
          description={hasFilters ? "Try broadening your filters or clearing them." : "No active students in the system yet. Import a snapshot to get started."}
          action={
            hasFilters ? (
              <Link href="/students">
                <Button variant="secondary">Clear filters</Button>
              </Link>
            ) : (
              <Link href="/students/import">
                <Button variant="secondary">Import snapshots</Button>
              </Link>
            )
          }
        />
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-sm">
              <thead>
                <tr className="border-b border-border/80 text-left text-xs uppercase tracking-wide text-muted">
                  <th className="px-4 py-3 font-medium">Student</th>
                  <th className="px-4 py-3 font-medium text-center">Year</th>
                  <th className="px-4 py-3 font-medium text-center">Attendance</th>
                  <th className="px-4 py-3 font-medium text-center">Last snapshot</th>
                  <th className="px-4 py-3 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {(students as Record<string, unknown>[]).map((s) => {
                  const snapshots = s.snapshots as { snapshotDate: Date | string; attendancePct: number | string }[] | undefined;
                  const latest = snapshots?.[0];
                  const sendFlag = s.sendFlag as boolean;
                  const ppFlag = s.ppFlag as boolean;
                  return (
                    <tr key={s.id as string} className="border-b border-border/50 last:border-0 hover:bg-[#f8fafc] calm-transition">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar name={s.fullName as string} size="sm" />
                          <div className="min-w-0">
                            <Link
                              href={`/students/${s.id}`}
                              className="font-medium text-text hover:text-accent calm-transition"
                            >
                              {s.fullName as string}
                            </Link>
                            {(sendFlag || ppFlag) && (
                              <div className="mt-0.5 flex gap-1">
                                {sendFlag && <StatusPill variant="info" size="sm">SEND</StatusPill>}
                                {ppFlag && <StatusPill variant="accent" size="sm">PP</StatusPill>}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center text-text">{(s.yearGroup as string) || "—"}</td>
                      <td className="px-4 py-3 text-center text-text">
                        {latest ? `${Number(latest.attendancePct).toFixed(1)}%` : "—"}
                      </td>
                      <td className="px-4 py-3 text-center text-muted">
                        {latest
                          ? new Date(latest.snapshotDate).toLocaleDateString(undefined, { day: "numeric", month: "short" })
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/students/${s.id}`}
                          className="text-xs font-medium text-accent hover:text-accentHover calm-transition"
                        >
                          View →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
