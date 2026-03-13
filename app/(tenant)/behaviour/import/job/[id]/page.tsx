import { notFound } from "next/navigation";
import Link from "next/link";
import { getSessionUserOrThrow } from "@/lib/auth";
import { requireFeature } from "@/lib/guards";
import { hasPermission } from "@/lib/rbac";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export default async function ImportJobPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await getSessionUserOrThrow();
  await requireFeature(user.tenantId, "STUDENTS_IMPORT");
  if (!hasPermission(user.role, "import:write")) redirect("/tenant");

  const job = await (prisma as any).importJob.findFirst({
    where: { id: params.id, tenantId: user.tenantId },
    include: { errors: { orderBy: { rowNumber: "asc" } } },
  });
  if (!job) notFound();

  const isRunning = ["PENDING", "PROCESSING", "RUNNING"].includes(job.status);
  const isFinished = ["COMPLETED", "SUCCESS", "FAILED"].includes(job.status);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/behaviour/import?tab=history" className="text-sm underline">
          ← Back to Import History
        </Link>
      </div>

      <h1 className="text-xl font-semibold">Import Job Report</h1>

      <div className="rounded border bg-surface p-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-text-muted">Status</span>
          <span
            className={
              job.status === "COMPLETED" || job.status === "SUCCESS"
                ? "text-green-700 font-medium"
                : job.status === "FAILED"
                ? "text-red-700 font-medium"
                : "text-text-muted"
            }
          >
            {job.status}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-text-muted">Type</span>
          <span>{job.type}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-text-muted">File</span>
          <span>{job.fileName || "–"}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-text-muted">Rows Processed</span>
          <span>{job.rowCount}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-text-muted">Created</span>
          <span>{new Date(job.createdAt).toLocaleString()}</span>
        </div>
      </div>

      {isRunning && (
        <div className="rounded border bg-surface p-4">
          <p className="text-sm text-text-muted">Import in progress…</p>
        </div>
      )}

      {isFinished && job.errors?.length > 0 && (
        <div className="space-y-2">
          <h2 className="font-medium">Errors ({job.errors.length})</h2>
          <table className="w-full border bg-surface text-sm">
            <thead>
              <tr className="border-b">
                <th className="p-2 text-left">Row</th>
                <th className="p-2 text-left">Field</th>
                <th className="p-2 text-left">Error</th>
              </tr>
            </thead>
            <tbody>
              {(job.errors as any[]).map((err: any) => (
                <tr key={err.id} className="border-b">
                  <td className="p-2">{err.rowNumber}</td>
                  <td className="p-2">{err.field}</td>
                  <td className="p-2">{err.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isFinished && (!job.errors || job.errors.length === 0) && (
        <div className="rounded border border-green-200 bg-green-50 p-3">
          <p className="text-sm text-green-700">Import completed with no errors.</p>
        </div>
      )}
    </div>
  );
}
