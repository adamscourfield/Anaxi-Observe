import Link from "next/link";
import { getSessionUserOrThrow } from "@/lib/auth";
import { requireFeature } from "@/lib/guards";
import { getTenantVocab } from "@/lib/vocab";

export default async function OnCallHomePage() {
  const user = await getSessionUserOrThrow();
  await requireFeature(user.tenantId, "ON_CALL");
  const vocab = await getTenantVocab(user.tenantId);

  return (
    <div className="space-y-3">
      <h1 className="text-xl font-semibold">{vocab.on_calls.plural}</h1>
      <div className="flex gap-4 text-sm">
        <Link href="/tenant/on-call/new" className="underline">Raise new {vocab.on_calls.singular.toLowerCase()}</Link>
        <Link href="/tenant/on-call/feed" className="underline">View {vocab.on_calls.singular.toLowerCase()} feed</Link>
      </div>
    </div>
  );
}
