import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/lib/admin";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { SectionHeader } from "@/components/ui/section-header";

export default async function AdminSettingsPage() {
  const user = await requireAdminUser();
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
    revalidatePath("/tenant/admin/settings");
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
    revalidatePath("/tenant/admin/settings");
    revalidatePath("/tenant/admin/features");
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Settings" subtitle="Configure school metadata, insight thresholds, and module availability." />

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

      <Card>
        <SectionHeader title="Module toggles" subtitle="Enable or disable modules for this school." />
        <div className="mt-3 space-y-2">
          {features.map((feature: any) => (
            <form key={feature.key} action={toggleFeature} className="flex flex-wrap items-center gap-3 rounded-lg border border-border/70 px-3 py-2">
              <input type="hidden" name="key" value={feature.key} />
              <input type="hidden" name="enabled" value={String(feature.enabled)} />
              <span className="w-48 text-sm font-medium text-text">{feature.key}</span>
              <span className="text-sm text-muted">{feature.enabled ? "Enabled" : "Disabled"}</span>
              <Button variant="secondary" type="submit">Toggle</Button>
            </form>
          ))}
        </div>
      </Card>
    </div>
  );
}
