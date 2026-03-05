import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/lib/admin";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";

export default async function AdminImportsPage() {
  const user = await requireAdminUser();
  const jobs = await (prisma as any).importJob.findMany({
    where: { tenantId: user.tenantId },
    orderBy: { createdAt: "desc" },
    include: { errors: { take: 5, orderBy: { createdAt: "desc" } } },
    take: 100
  });

  return (
    <div className="space-y-4">
      <PageHeader title="Import jobs" subtitle="Recent import status, row counts, and top errors." />
      <Card className="overflow-hidden p-0">
        {jobs.length === 0 ? (
          <div className="p-4"><EmptyState title="No import jobs yet" description="Imported files will appear here with status and errors." /></div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-bg/60 text-left text-xs uppercase tracking-[0.05em] text-muted">
                <th className="p-2">Type</th><th className="p-2 text-center">Status</th><th className="p-2">File</th><th className="p-2 text-center">Rows</th><th className="p-2">Error summary</th>
              </tr>
            </thead>
            <tbody>
              {(jobs as any[]).map((j: any) => (
                <tr key={j.id} className="border-b border-border/70 align-top last:border-0">
                  <td className="p-2">{j.type}</td>
                  <td className="p-2 text-center">{j.status}</td>
                  <td className="p-2">{j.fileName}</td>
                  <td className="p-2 text-center">{j.rowCount}</td>
                  <td className="p-2">
                    <div>{j.errorSummary || "-"}</div>
                    {j.errors?.length ? <ul className="list-disc pl-5 text-xs text-muted">{j.errors.map((e: any) => <li key={e.id}>row {e.rowNumber} {e.field}: {e.message}</li>)}</ul> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
