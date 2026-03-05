import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/lib/admin";
import { SIGNAL_DEFINITIONS } from "@/modules/observations/signalDefinitions";
import { getTenantSignalLabels, upsertTenantSignalLabel } from "@/modules/observations/tenantSignalLabels";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { SectionHeader } from "@/components/ui/section-header";

const BEHAVIOUR_FIELDS = [
  { key: "positivePointsLabel", label: "Positive points label", default: "Positive Points" },
  { key: "detentionLabel", label: "Detention label", default: "Detention" },
  { key: "internalExclusionLabel", label: "Internal exclusion label", default: "Internal Exclusion" },
  { key: "suspensionLabel", label: "Suspension label", default: "Suspension" },
  { key: "onCallLabel", label: "On call label", default: "On Call" },
] as const;

export default async function AdminLanguagePage() {
  const user = await requireAdminUser();

  const settings = await (prisma as any).tenantSettings.findUnique({ where: { tenantId: user.tenantId } });
  const signalLabels = await getTenantSignalLabels(user.tenantId);

  async function saveBehaviourLabels(formData: FormData) {
    "use server";
    const admin = await requireAdminUser();
    const data: Record<string, string> = {};
    for (const field of BEHAVIOUR_FIELDS) {
      const val = String(formData.get(field.key) || field.default).trim();
      data[field.key] = val || field.default;
    }
    await (prisma as any).tenantSettings.upsert({
      where: { tenantId: admin.tenantId },
      update: data,
      create: { tenantId: admin.tenantId, ...data },
    });
    revalidatePath("/tenant/admin/language");
  }

  async function saveSignalLabels(formData: FormData) {
    "use server";
    const admin = await requireAdminUser();
    for (const signal of SIGNAL_DEFINITIONS) {
      const displayName = String(formData.get(`display_${signal.key}`) || signal.displayNameDefault).trim();
      const description = String(formData.get(`description_${signal.key}`) || "");
      await upsertTenantSignalLabel(admin.tenantId, signal.key, displayName || signal.displayNameDefault, description);
    }
    revalidatePath("/tenant/admin/language");
  }

  async function resetSignal(formData: FormData) {
    "use server";
    const admin = await requireAdminUser();
    const key = String(formData.get("signalKey") || "");
    const signal = SIGNAL_DEFINITIONS.find((s) => s.key === key);
    if (!signal) return;
    await upsertTenantSignalLabel(admin.tenantId, signal.key, signal.displayNameDefault, null);
    revalidatePath("/tenant/admin/language");
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Language" subtitle="Customize behaviour terminology and observation signal copy." />

      <Card>
        <SectionHeader title="Behaviour labels" subtitle="Override labels used across behaviour and leave workflows." />
        <form action={saveBehaviourLabels} className="mt-3 grid max-w-3xl gap-3 sm:grid-cols-2">
          {BEHAVIOUR_FIELDS.map((field) => (
            <div key={field.key}>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.04em] text-muted">{field.label}</label>
              <input
                name={field.key}
                defaultValue={settings?.[field.key] ?? field.default}
                placeholder={field.default}
                className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm"
              />
            </div>
          ))}
          <div className="sm:col-span-2">
            <Button type="submit">Save behaviour labels</Button>
          </div>
        </form>
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="p-4 pb-0">
          <SectionHeader title="Observation signal labels" subtitle="Adjust display names and descriptions used in observation screens." />
        </div>
        <form action={saveSignalLabels} className="space-y-3 p-4 pt-3">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-bg/60 text-left text-xs uppercase tracking-[0.05em] text-muted">
                  <th className="p-2">Signal</th>
                  <th className="p-2">Default name</th>
                  <th className="p-2">Display name</th>
                  <th className="p-2">Description</th>
                  <th className="p-2 text-center">Reset</th>
                </tr>
              </thead>
              <tbody>
                {SIGNAL_DEFINITIONS.map((signal) => {
                  const override = signalLabels[signal.key];
                  return (
                    <tr className="border-b border-border/70 align-top last:border-0" key={signal.key}>
                      <td className="p-2 font-mono text-xs">{signal.key}</td>
                      <td className="p-2">{signal.displayNameDefault}</td>
                      <td className="p-2">
                        <input
                          name={`display_${signal.key}`}
                          defaultValue={override?.displayName || signal.displayNameDefault}
                          minLength={2}
                          maxLength={80}
                          required
                          className="w-full rounded-lg border border-border bg-bg px-2 py-1.5"
                        />
                      </td>
                      <td className="p-2">
                        <textarea
                          name={`description_${signal.key}`}
                          defaultValue={override?.description ?? signal.descriptionDefault}
                          maxLength={240}
                          rows={2}
                          className="w-full rounded-lg border border-border bg-bg px-2 py-1.5"
                        />
                      </td>
                      <td className="p-2 text-center">
                        <Button formAction={resetSignal} name="signalKey" value={signal.key} type="submit" variant="ghost" className="px-2 py-1 text-xs">
                          Reset
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Button type="submit">Save signal labels</Button>
        </form>
      </Card>
    </div>
  );
}
