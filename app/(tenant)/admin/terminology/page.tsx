import Link from "next/link";
import { requireAdminUser } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { SectionHeader } from "@/components/ui/section-header";

export default async function AdminTerminologyPage() {
  const user = await requireAdminUser();
  const observationsFeature = await prisma.tenantFeature.findUnique({
    where: { tenantId_key: { tenantId: user.tenantId, key: "OBSERVATIONS" } }
  });

  const cards = [
    {
      href: "/tenant/admin/language",
      label: "Language",
      desc: "Behaviour terminology and signal copy used across workflows."
    },
    {
      href: "/tenant/admin/vocab",
      label: "Vocabulary",
      desc: "Singular/plural event labels shown in behaviour views."
    },
    ...(observationsFeature?.enabled
      ? [{
          href: "/tenant/admin/signals",
          label: "Observation signals",
          desc: "Signal display names and descriptions in observation journeys."
        }]
      : []),
  ];

  return (
    <div className="space-y-5">
      <PageHeader title="Terminology" subtitle="Central place for language, vocabulary, and signal wording." />
      <Card>
        <SectionHeader
          title="Label sources"
          subtitle="Use these pages together to keep wording consistent across the product."
        />
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => (
            <Link key={card.href} href={card.href}>
              <Card className="h-full transition hover:border-accent/50 hover:bg-bg/40">
                <div className="font-semibold text-text">{card.label}</div>
                <div className="mt-1 text-sm text-muted">{card.desc}</div>
              </Card>
            </Link>
          ))}
        </div>
      </Card>
    </div>
  );
}
