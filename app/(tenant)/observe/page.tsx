import Link from "next/link";
import { getSessionUserOrThrow } from "@/lib/auth";
import { requireFeature } from "@/lib/guards";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { H1, MetaText } from "@/components/ui/typography";

export default async function ObservePage() {
  const user = await getSessionUserOrThrow();
  await requireFeature(user.tenantId, "OBSERVATIONS");

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <H1>Observations</H1>
        <MetaText>Capture evidence, then review patterns over time.</MetaText>
      </div>

      <Card className="space-y-4">
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
