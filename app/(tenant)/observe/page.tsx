import Link from "next/link";
import { getSessionUserOrThrow } from "@/lib/auth";
import { requireFeature } from "@/lib/guards";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";

export default async function ObservePage() {
  const user = await getSessionUserOrThrow();
  await requireFeature(user.tenantId, "OBSERVATIONS");

  return (
    <div className="space-y-5">
      <PageHeader title="Observations" subtitle="Capture evidence, then review patterns over time." />

      <Card className="space-y-3">
        <p className="text-sm text-muted">Choose a workflow to continue.</p>
        <div className="flex flex-wrap gap-2 text-sm">
          {user.role !== "TEACHER" ? (
            <Link href="/tenant/observe/new">
              <Button>New observation</Button>
            </Link>
          ) : null}
          <Link href="/tenant/observe/history">
            <Button variant="secondary">Observation history</Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
