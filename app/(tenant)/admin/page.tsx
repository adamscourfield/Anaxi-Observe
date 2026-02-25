import Link from "next/link";
import { requireAdminUser } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export default async function AdminIndexPage() {
  const user = await requireAdminUser();
  const observationsFeature = await prisma.tenantFeature.findUnique({
    where: { tenantId_key: { tenantId: user.tenantId, key: "OBSERVATIONS" } }
  });
  const onboardingDone = await (prisma as any).tenantSettings.findUnique({
    where: { tenantId: user.tenantId },
    select: { onboardingCompletedAt: true }
  });

  const cards = [
    { href: "/tenant/admin/users", label: "Users", desc: "Manage staff accounts and roles" },
    { href: "/tenant/admin/departments", label: "Departments", desc: "Departments and HOD assignments" },
    { href: "/tenant/admin/coaching", label: "Coaching", desc: "Coach–coachee visibility assignments" },
    { href: "/tenant/admin/leave-approvals", label: "Leave approvals", desc: "Approval groups and scope" },
    { href: "/tenant/admin/features", label: "Features", desc: "Enable or disable modules" },
    { href: "/tenant/admin/language", label: "Language", desc: "Behaviour & signal label customisation" },
    { href: "/tenant/admin/timetable", label: "Timetable", desc: "Optional timetable CSV upload" },
    { href: "/tenant/admin/settings", label: "Settings", desc: "School name, timezone, thresholds" },
    { href: "/tenant/admin/vocab", label: "Vocabulary", desc: "Behaviour point labels" },
    ...(observationsFeature?.enabled ? [{ href: "/tenant/admin/signals", label: "Signal labels", desc: "Observation signal overrides" }] : []),
    { href: "/tenant/admin/taxonomies", label: "Taxonomies", desc: "Reasons, locations, LOA config" },
    { href: "/tenant/admin/imports", label: "Imports", desc: "Import jobs and mappings" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Admin</h1>
        {!onboardingDone?.onboardingCompletedAt && (
          <Link
            href="/tenant/onboarding"
            className="rounded bg-slate-900 px-4 py-2 text-sm text-white"
          >
            Run onboarding wizard →
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="rounded-lg border bg-white p-4 shadow-sm transition hover:bg-slate-50"
          >
            <div className="font-semibold">{card.label}</div>
            <div className="mt-1 text-sm text-slate-500">{card.desc}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}

