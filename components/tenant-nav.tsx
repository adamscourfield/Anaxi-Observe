import Link from "next/link";
import { FeatureKey, UserRole } from "@/lib/types";

export function TenantNav({
  role,
  enabledFeatures,
  onCallCount = 0,
  leaveCount = 0,
}: {
  role: UserRole;
  enabledFeatures: FeatureKey[];
  onCallCount?: number;
  leaveCount?: number;
}) {
  const has = (feature: FeatureKey) => enabledFeatures.includes(feature);
  const canImport = role === "SLT" || role === "ADMIN";
  return (
    <nav className="mb-6 flex gap-4 text-sm">
      <Link href="/tenant">Home</Link>
      {has("OBSERVATIONS") && <Link href="/tenant/observe">Observations</Link>}
      {has("OBSERVATIONS") && <Link href="/tenant/observe/history">Signals</Link>}
      {has("STUDENTS") && <Link href="/tenant/students">Students</Link>}
      {has("STUDENTS_IMPORT") && canImport && (
        <Link href="/tenant/behaviour/import">Behaviour Import</Link>
      )}
      {has("ON_CALL") && (
        <Link href="/tenant/on-call" className="inline-flex items-center gap-1">
          On Call
          {onCallCount > 0 && (
            <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-xs text-white">
              {onCallCount}
            </span>
          )}
        </Link>
      )}
      {has("MEETINGS") && <Link href="/tenant/meetings">Meetings</Link>}
      {has("LEAVE") && (
        <Link href="/tenant/leave" className="inline-flex items-center gap-1">
          Leave of Absence
          {leaveCount > 0 && (
            <span className="rounded-full bg-amber-500 px-1.5 py-0.5 text-xs text-white">
              {leaveCount}
            </span>
          )}
        </Link>
      )}
      {role === "ADMIN" && has("ADMIN") && <Link href="/tenant/admin">Admin</Link>}
    </nav>
  );
}
