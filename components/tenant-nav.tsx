import Link from "next/link";
import { FeatureKey, UserRole } from "@/lib/types";

export function TenantNav({ role, enabledFeatures }: { role: UserRole; enabledFeatures: FeatureKey[] }) {
  const has = (feature: FeatureKey) => enabledFeatures.includes(feature);
  return (
    <nav className="mb-6 flex gap-4 text-sm">
      <Link href="/tenant">Home</Link>
      {has("OBSERVATIONS") && <Link href="/tenant/observe">Observe</Link>}
      {has("STUDENTS") && <Link href="/tenant/students">Students</Link>}
      {has("ON_CALL") && <Link href="/tenant/on-call">On Call</Link>}
      {has("LEAVE") && <Link href="/tenant/leave">Leave</Link>}
      {has("MEETINGS") && <Link href="/tenant/meetings">Meetings</Link>}
      {role === "ADMIN" && has("ADMIN") && <Link href="/tenant/admin/users">Admin</Link>}
    </nav>
  );
}
