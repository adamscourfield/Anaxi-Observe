import Link from "next/link";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/lib/admin";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { SectionHeader } from "@/components/ui/section-header";

const TABS = ["school", "modules"] as const;
type Tab = (typeof TABS)[number];

const FEATURE_DESCRIPTIONS: Record<string, string> = {
  OBSERVATIONS: "Observation workflows, review history, and signal capture.",
  SIGNALS: "Signal definitions and signal-based analysis capabilities.",
  STUDENTS: "Student directory, student views, and related workflows.",
  STUDENTS_IMPORT: "Student import tooling and mapping workflows.",
  BEHAVIOUR_IMPORT: "Behaviour snapshot and attendance import workflows.",
  LEAVE: "Leave request and approval workflows.",
  LEAVE_OF_ABSENCE: "Legacy alias for leave module availability.",
  ON_CALL: "On-call request, inbox, and response workflows.",
  MEETINGS: "Meeting agendas, attendees, and actions.",
  TIMETABLE: "Timetable upload and class context enrichment.",
  ADMIN: "Admin configuration pages and management tools.",
  ADMIN_SETTINGS: "Tenant-level settings and configuration pages.",
  ANALYSIS: "Teacher and school analysis dashboards.",
  STUDENT_ANALYSIS: "Student risk and student-level analysis pages.",
};

export default async function AdminSettingsPage({ searchParams }: { searchParams?: { tab?: string } }) {
  const user = await requireAdminUser();
  const tab = (TABS.includes((searchParams?.tab as Tab) || "school") ? (searchParams?.tab as Tab) : "school") as Tab;

  const settings = await (prisma as any).tenantSettings.findUnique({ where: { tenantId: user.tenantId } });
  const features = await prisma.tenantFeature.findMany({ where: { tenantId: user.tenantId }, orderBy: { key: "asc" } });

  async function saveSettings(formData: FormData) {
    "use server";
    const admin = await requireAdminUser();
    const schoolName = String(formData.get("schoolName") || "").trim();
    const timezone = String(formData.get("timezone") || "Europe/London");
    const defaultInsightWindowDays = parseInt(String(formData.get("defaultInsightWindowDays") || "21"));
    const driftDeltaThreshold = parseFloat(String(formData.get("driftDeltaThreshold") || "0.15"));
    const minObservationCount = parseInt(String(formData.get("minObservationCount") || "3"));
    const behaviourSpikePercent = parseFloat(String(formData.get("behaviourSpikePercent") || "50"));
    await (prisma as any).tenantSettings.upsert({
      where: { tenantId: admin.tenantId },
      update: { schoolName, timezone, defaultInsightWindowDays, driftDeltaThreshold, minObservationCount, behaviourSpikePercent },
      create: { tenantId: admin.tenantId, schoolName, timezone, defaultInsightWindowDays, driftDeltaThreshold, minObservationCount, behaviourSpikePercent },
    });
    if (schoolName) {
      await prisma.tenant.update({ where: { id: admin.tenantId }, data: { name: schoolName } });
    }
    revalidatePath("/admin/settings");
  }

  async function toggleFeature(formData: FormData) {
    "use server";
    const admin = await requireAdminUser();
    const key = String(formData.get("key")) as any;
    const enabled = String(formData.get("enabled")) === "true";
    await prisma.tenantFeature.upsert({
      where: { tenantId_key: { tenantId: admin.tenantId, key } },
      create: { tenantId: admin.tenantId, key, enabled: !enabled },
      update: { enabled: !enabled },
    });
    revalidatePath("/admin/settings");
    revalidatePath("/admin/features");
  }

  const tabLink = (value: Tab, label: string) => (
    <Link
      key={value}
      href={`/admin/settings?tab=${value}`}
      className={`rounded-lg border px-3 py-1.5 text-sm calm-transition ${tab === value ? "border-transparent bg-primaryBtn text-white" : "border-border bg-surface text-text hover:bg-bg/80"}`}
    >
      {label}
    </Link>
  );

  return (
    <div className="space-y-4">
      <Link href="/admin" className="text-xs text-accent hover:underline">← Back to Admin</Link>
      <PageHeader title="Platform" subtitle="Configure school metadata, thresholds, and module availability." />

      <div className="flex flex-wrap gap-2">
        {tabLink("school", "School settings")}
        {tabLink("modules", "Modules")}
      </div>

      {tab === "school" ? (
        <Card>
          <SectionHeader title="School details" subtitle="Set the school name, timezone, and default insight window." />
          <form action={saveSettings} className="mt-3 space-y-4">
            <div className="grid max-w-2xl gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.04em] text-muted">School name</label>
                <input name="schoolName" defaultValue={settings?.schoolName ?? ""} placeholder="My School" className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.04em] text-muted">Timezone</label>
                <select name="timezone" defaultValue={settings?.timezone ?? "Europe/London"} className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm">
                  <option value="Europe/London">Europe/London</option>
                  <option value="Europe/Dublin">Europe/Dublin</option>
                  <option value="America/New_York">America/New_York</option>
                  <option value="America/Chicago">America/Chicago</option>
                  <option value="America/Los_Angeles">America/Los_Angeles</option>
                  <option value="Australia/Sydney">Australia/Sydney</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.04em] text-muted">Default insight window</label>
                <select name="defaultInsightWindowDays" defaultValue={String(settings?.defaultInsightWindowDays ?? 21)} className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm">
                  <option value="7">7 days</option>
                  <option value="21">21 days</option>
                  <option value="28">28 days</option>
                </select>
              </div>
            </div>

            <details className="rounded-lg border border-border/80 bg-bg/20 p-3">
              <summary className="cursor-pointer text-sm font-medium">Advanced thresholds</summary>
              <div className="mt-3 grid max-w-2xl gap-3 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.04em] text-muted">Drift delta</label>
                  <input type="number" step="0.01" name="driftDeltaThreshold" defaultValue={settings?.driftDeltaThreshold ?? 0.15} className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.04em] text-muted">Min observations</label>
                  <input type="number" name="minObservationCount" defaultValue={settings?.minObservationCount ?? 3} className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.04em] text-muted">Behaviour spike %</label>
                  <input type="number" step="1" name="behaviourSpikePercent" defaultValue={settings?.behaviourSpikePercent ?? 50} className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm" />
                </div>
              </div>
            </details>

            <Button type="submit">Save settings</Button>
          </form>
        </Card>
      ) : null}

      {tab === "modules" ? (
        <Card>
          <SectionHeader title="Module toggles" subtitle="Enable or disable modules for this school." />
          <div className="mt-3 space-y-2">
            {features.map((feature: any) => (
              <form key={feature.key} action={toggleFeature} className="flex flex-wrap items-center gap-3 rounded-lg border border-border/70 px-3 py-2">
                <input type="hidden" name="key" value={feature.key} />
                <input type="hidden" name="enabled" value={String(feature.enabled)} />
                <div className="w-72 min-w-[16rem]">
                  <span className="text-sm font-medium text-text">{feature.key}</span>
                  <p className="text-xs text-muted">{FEATURE_DESCRIPTIONS[feature.key] ?? "Controls access to this module across the tenant."}</p>
                </div>
                <span className="text-sm text-muted">{feature.enabled ? "Enabled" : "Disabled"}</span>
                <Button variant="secondary" type="submit">Toggle</Button>
              </form>
            ))}
          </div>
        </Card>
      ) : null}
    </div>
  );
}
