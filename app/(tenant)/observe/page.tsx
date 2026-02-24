import Link from "next/link";
import { getSessionUserOrThrow } from "@/lib/auth";
import { requireFeature } from "@/lib/guards";

export default async function ObservePage() {
  const user = await getSessionUserOrThrow();
  await requireFeature(user.tenantId, "OBSERVATIONS");

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Observations</h1>
      <div className="flex gap-3 text-sm">
        {user.role !== "TEACHER" ? <Link className="underline" href="/tenant/observe/new">New observation</Link> : null}
        <Link className="underline" href="/tenant/observe/history">Observation history</Link>
      </div>
    </div>
  );
}
