import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/lib/admin";

export default async function AdminImportsPage() {
  const user = await requireAdminUser();
  const jobs = await (prisma as any).importJob.findMany({
    where: { tenantId: user.tenantId },
    orderBy: { createdAt: "desc" },
    include: { errors: { take: 5, orderBy: { createdAt: "desc" } } },
    take: 100
  });

  return (
    <div className="space-y-3">
      <h1 className="text-xl font-semibold">Import jobs</h1>
      <table className="w-full border bg-white text-sm">
        <thead><tr className="border-b"><th className="p-2 text-left">Type</th><th className="p-2">Status</th><th className="p-2 text-left">File</th><th className="p-2">Rows</th><th className="p-2 text-left">Error summary</th></tr></thead>
        <tbody>
          {(jobs as any[]).map((j: any) => (
            <tr key={j.id} className="border-b align-top">
              <td className="p-2">{j.type}</td>
              <td className="p-2 text-center">{j.status}</td>
              <td className="p-2">{j.fileName}</td>
              <td className="p-2 text-center">{j.rowCount}</td>
              <td className="p-2">
                <div>{j.errorSummary || "-"}</div>
                {j.errors?.length ? <ul className="list-disc pl-5 text-xs">{j.errors.map((e: any) => <li key={e.id}>row {e.rowNumber} {e.field}: {e.message}</li>)}</ul> : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
