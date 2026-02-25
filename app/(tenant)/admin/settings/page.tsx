import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/lib/admin";
import { revalidatePath } from "next/cache";

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
      create: { tenantId: admin.tenantId, schoolName, timezone, defaultInsightWindowDays, driftDeltaThreshold, minObservationCount, behaviourSpikePercent }
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
      update: { enabled: !enabled }
    });
    revalidatePath("/tenant/admin/settings");
    revalidatePath("/tenant/admin/features");
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Settings</h1>

      <form action={saveSettings} className="space-y-4 rounded border bg-white p-4 shadow-sm">
        <h2 className="font-semibold">School details</h2>
        <div className="grid max-w-lg gap-3">
          <div>
            <label className="mb-1 block text-sm">School name</label>
            <input name="schoolName" defaultValue={settings?.schoolName ?? ""} placeholder="My School" className="w-full rounded border p-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-sm">Timezone</label>
            <select name="timezone" defaultValue={settings?.timezone ?? "Europe/London"} className="w-full rounded border p-2 text-sm">
              <option value="Europe/London">Europe/London</option>
              <option value="Europe/Dublin">Europe/Dublin</option>
              <option value="America/New_York">America/New_York</option>
              <option value="America/Chicago">America/Chicago</option>
              <option value="America/Los_Angeles">America/Los_Angeles</option>
              <option value="Australia/Sydney">Australia/Sydney</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm">Default insight window (days)</label>
            <select name="defaultInsightWindowDays" defaultValue={String(settings?.defaultInsightWindowDays ?? 21)} className="rounded border p-2 text-sm">
              <option value="7">7 days</option>
              <option value="21">21 days</option>
              <option value="28">28 days</option>
            </select>
          </div>
        </div>

        <details className="rounded border p-3">
          <summary className="cursor-pointer text-sm font-medium">Advanced thresholds</summary>
          <div className="mt-3 grid max-w-lg gap-3">
            <div>
              <label className="mb-1 block text-sm">Drift delta threshold</label>
              <input type="number" step="0.01" name="driftDeltaThreshold" defaultValue={settings?.driftDeltaThreshold ?? 0.15} className="rounded border p-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-sm">Min observation count</label>
              <input type="number" name="minObservationCount" defaultValue={settings?.minObservationCount ?? 3} className="rounded border p-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-sm">Behaviour spike % threshold</label>
              <input type="number" step="1" name="behaviourSpikePercent" defaultValue={settings?.behaviourSpikePercent ?? 50} className="rounded border p-2 text-sm" />
            </div>
          </div>
        </details>

        <button type="submit" className="rounded bg-slate-900 px-4 py-2 text-sm text-white">Save settings</button>
      </form>

      <div className="rounded border bg-white p-4 shadow-sm">
        <h2 className="mb-3 font-semibold">Module toggles</h2>
        <p className="mb-3 text-sm text-slate-600">Enable or disable modules for this school.</p>
        <div className="space-y-2">
          {features.map((feature: any) => (
            <form key={feature.key} action={toggleFeature} className="flex items-center gap-3 rounded border p-3">
              <input type="hidden" name="key" value={feature.key} />
              <input type="hidden" name="enabled" value={String(feature.enabled)} />
              <span className="w-48 font-medium text-sm">{feature.key}</span>
              <span className="text-sm">{feature.enabled ? "Enabled" : "Disabled"}</span>
              <button className="underline text-sm" type="submit">Toggle</button>
            </form>
          ))}
        </div>
      </div>
    </div>
  );
}
