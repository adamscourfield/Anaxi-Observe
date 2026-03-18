import Link from "next/link";
import { ReactNode } from "react";
import { requireAdminUser } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { StatusPill } from "@/components/ui/status-pill";

type AdminCard = { href: string; label: string; desc: string; icon: ReactNode };

// ─── Icons ────────────────────────────────────────────────────────────────────

const UsersIcon = () => (
  <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
  </svg>
);

const DepartmentsIcon = () => (
  <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
    <rect x="2" y="3" width="6" height="5" rx="1.5" />
    <rect x="16" y="3" width="6" height="5" rx="1.5" />
    <rect x="9" y="16" width="6" height="5" rx="1.5" />
    <path d="M5 8v3h14V8M12 11v5" />
  </svg>
);

const CoachingIcon = () => (
  <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
  </svg>
);

const CalendarCheckIcon = () => (
  <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
    <polyline points="9 16 11 18 15 14" />
  </svg>
);

const SettingsIcon = () => (
  <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
  </svg>
);

const TerminologyIcon = () => (
  <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
    <path d="M4 7V4h16v3M9 20h6M12 4v16" />
  </svg>
);

const TagIcon = () => (
  <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
    <line x1="7" y1="7" x2="7.01" y2="7" strokeLinecap="round" strokeWidth="2.5" />
  </svg>
);

const TimetableIcon = () => (
  <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <line x1="3" y1="9" x2="21" y2="9" />
    <line x1="3" y1="15" x2="21" y2="15" />
    <line x1="9" y1="3" x2="9" y2="21" />
    <line x1="15" y1="3" x2="15" y2="21" />
  </svg>
);

const ImportsIcon = () => (
  <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
    <polyline points="16 16 12 12 8 16" />
    <line x1="12" y1="12" x2="12" y2="21" />
    <path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3" />
  </svg>
);

// ─── Card component ───────────────────────────────────────────────────────────

function AdminCardItem({ card }: { card: AdminCard }) {
  return (
    <Link href={card.href} className="group block">
      <div className="flex items-start gap-3.5 rounded-xl border border-border bg-white p-4 shadow-sm calm-transition group-hover:border-accent/40 group-hover:shadow-md">
        <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-[#f4f7fb] text-muted calm-transition group-hover:bg-[var(--accent-tint)] group-hover:text-accent">
          {card.icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[0.875rem] font-semibold tracking-[-0.01em] text-text">{card.label}</span>
            <svg
              className="h-3.5 w-3.5 flex-shrink-0 text-muted/40 calm-transition group-hover:translate-x-0.5 group-hover:text-accent"
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>
          <p className="mt-0.5 text-[0.8125rem] leading-snug text-muted">{card.desc}</p>
        </div>
      </div>
    </Link>
  );
}

// ─── Section component ────────────────────────────────────────────────────────

function Section({ title, subtitle, cards }: { title: string; subtitle: string; cards: AdminCard[] }) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-[0.9375rem] font-semibold tracking-[-0.01em] text-text">{title}</h2>
        <p className="mt-0.5 text-[0.8125rem] text-muted">{subtitle}</p>
      </div>
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <AdminCardItem key={card.href} card={card} />
        ))}
      </div>
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AdminIndexPage() {
  const user = await requireAdminUser();
  const onboardingDone = await (prisma as any).tenantSettings.findUnique({
    where: { tenantId: user.tenantId },
    select: { onboardingCompletedAt: true },
  });

  const isOnboarded = !!onboardingDone?.onboardingCompletedAt;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Administration"
        title="Admin"
        subtitle="Configure people, platform, language, and operational data."
        meta={
          <StatusPill variant={isOnboarded ? "success" : "warning"}>
            {isOnboarded ? "Setup complete" : "Setup required"}
          </StatusPill>
        }
        actions={
          !isOnboarded ? (
            <Link href="/onboarding"><Button>Run setup wizard</Button></Link>
          ) : undefined
        }
      />

      <Section
        title="People & access"
        subtitle="Manage who can sign in, what they can see, and approval ownership."
        cards={[
          { href: "/admin/users", label: "Users", desc: "Staff accounts, roles, status, and notification flags", icon: <UsersIcon /> },
          { href: "/admin/departments", label: "Departments", desc: "Department structure, memberships, and HODs", icon: <DepartmentsIcon /> },
          { href: "/admin/coaching", label: "Coaching", desc: "Coach–coachee visibility assignments", icon: <CoachingIcon /> },
          { href: "/admin/leave-approvals", label: "Leave approvals", desc: "Approval groups and staff coverage scope", icon: <CalendarCheckIcon /> },
        ]}
      />

      <Section
        title="Platform & language"
        subtitle="School-wide defaults, module toggles, and terminology."
        cards={[
          { href: "/admin/settings", label: "Settings", desc: "School settings, thresholds, and module toggles", icon: <SettingsIcon /> },
          { href: "/admin/terminology", label: "Terminology", desc: "Language, vocabulary, and signal labels", icon: <TerminologyIcon /> },
        ]}
      />

      <Section
        title="Data & imports"
        subtitle="Taxonomies, timetable, and import jobs that power daily workflows."
        cards={[
          { href: "/admin/taxonomies", label: "Taxonomies", desc: "LOA/on-call reasons, locations, and recipients", icon: <TagIcon /> },
          { href: "/admin/timetable", label: "Timetable", desc: "Timetable CSV import and current entries", icon: <TimetableIcon /> },
          { href: "/admin/imports", label: "Import jobs", desc: "Import history, row counts, and errors", icon: <ImportsIcon /> },
        ]}
      />
    </div>
  );
}
