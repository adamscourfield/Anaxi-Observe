import Link from "next/link";
import { requireAdminUser } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { InteractiveCard } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { SectionHeader } from "@/components/ui/section-header";
import { StatusPill } from "@/components/ui/status-pill";

type AdminCard = { href: string; label: string; desc: string };

function CardGrid({ cards }: { cards: AdminCard[] }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => (
        <Link key={card.href} href={card.href}>
          <InteractiveCard className="h-full p-4">
            <div className="flex h-full flex-col justify-between gap-5">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-semibold text-text">{card.label}</div>
                  <StatusPill variant="neutral" size="sm">Open</StatusPill>
                </div>
                <div className="text-sm leading-relaxed text-muted">{card.desc}</div>
              </div>
              <div className="text-xs font-medium text-accent">Open area →</div>
            </div>
          </InteractiveCard>
        </Link>
      ))}
    </div>
  );
}

export default async function AdminIndexPage() {
  const user = await requireAdminUser();
  const onboardingDone = await (prisma as any).tenantSettings.findUnique({
    where: { tenantId: user.tenantId },
    select: { onboardingCompletedAt: true }
  });

  const peopleAccessCards: AdminCard[] = [
    { href: "/admin/users", label: "Users", desc: "Staff accounts, roles, status, and notification flags" },
    { href: "/admin/departments", label: "Departments", desc: "Department structure, memberships, and HODs" },
    { href: "/admin/coaching", label: "Coaching", desc: "Coach ↔ coachee visibility assignments" },
    { href: "/admin/leave-approvals", label: "Leave approval rules", desc: "Approval groups and staff coverage scope" },
  ];

  const platformCards: AdminCard[] = [
    { href: "/admin/settings", label: "Platform", desc: "School settings, thresholds, and module toggles" },
  ];

  const languageCards: AdminCard[] = [
    { href: "/admin/terminology", label: "Terminology", desc: "Language, vocabulary, and signal labels" },
  ];

  const operationsCards: AdminCard[] = [
    { href: "/admin/taxonomies", label: "Taxonomies", desc: "LOA/on-call reasons, locations, and recipients" },
    { href: "/admin/timetable", label: "Timetable", desc: "Timetable CSV import and latest rows" },
    { href: "/admin/imports", label: "Import jobs", desc: "Import status, row counts, and errors" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administration"
        title="Admin"
        subtitle="Configure people access, platform behaviour, language, and operational data."
        meta={
          <>
            <StatusPill variant="neutral">4 setup areas</StatusPill>
            <StatusPill variant={onboardingDone?.onboardingCompletedAt ? "success" : "warning"}>
              {onboardingDone?.onboardingCompletedAt ? "Onboarding complete" : "Onboarding still required"}
            </StatusPill>
          </>
        }
        actions={
          !onboardingDone?.onboardingCompletedAt ? (
            <Link href="/onboarding"><Button>Run onboarding wizard</Button></Link>
          ) : undefined
        }
      />

      <section className="space-y-3">
        <SectionHeader title="People & access" subtitle="Who can sign in, what they can see, and approval ownership." />
        <CardGrid cards={peopleAccessCards} />
      </section>

      <section className="space-y-3">
        <SectionHeader title="Platform configuration" subtitle="School-wide defaults and module availability." />
        <CardGrid cards={platformCards} />
      </section>

      <section className="space-y-3">
        <SectionHeader title="Language & labels" subtitle="Control terminology shown to users across workflows." />
        <CardGrid cards={languageCards} />
      </section>

      <section className="space-y-3">
        <SectionHeader title="Operational data" subtitle="Taxonomies, timetable, and imports that power daily workflows." />
        <CardGrid cards={operationsCards} />
      </section>
    </div>
  );
}
