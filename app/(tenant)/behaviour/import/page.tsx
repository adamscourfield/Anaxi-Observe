import { getSessionUserOrThrow } from "@/lib/auth";
import { requireFeature } from "@/lib/guards";
import { hasPermission } from "@/lib/rbac";
import { redirect } from "next/navigation";
import { ImportJobHistory } from "@/components/import/ImportJobHistory";
import { CsvImportMapper } from "@/components/import/CsvImportMapper";
import { H1 } from "@/components/ui/typography";
import Link from "next/link";

export default async function BehaviourImportPage({
  searchParams,
}: {
  searchParams: Record<string, string | undefined>;
}) {
  const user = await getSessionUserOrThrow();
  await requireFeature(user.tenantId, "STUDENTS_IMPORT");
  if (!hasPermission(user.role, "import:write")) redirect("/tenant");

  const tab = searchParams.tab ?? "upload";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <H1>Import Student Snapshot Data</H1>
      </div>

      <div className="flex gap-4 border-b border-border">
        <Link
          href="?tab=upload"
          className={`pb-2 text-sm ${tab === "upload" ? "border-b-2 border-text font-medium text-text" : "text-muted"}`}
        >
          Upload
        </Link>
        <Link
          href="?tab=history"
          className={`pb-2 text-sm ${tab === "history" ? "border-b-2 border-text font-medium text-text" : "text-muted"}`}
        >
          History
        </Link>
      </div>

      {tab === "upload" && <CsvImportMapper />}

      {tab === "history" && (
        <div className="space-y-3">
          <h2 className="font-medium text-text">Import History</h2>
          <ImportJobHistory />
        </div>
      )}
    </div>
  );
}
