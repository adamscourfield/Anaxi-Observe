import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/lib/admin";
import { revalidatePath } from "next/cache";
import { SIGNAL_DEFINITIONS } from "@/modules/observations/signalDefinitions";
import { getTenantSignalLabels, upsertTenantSignalLabel } from "@/modules/observations/tenantSignalLabels";

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
      create: { tenantId: admin.tenantId, ...data }
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
    <div className="space-y-8">
      <h1 className="text-xl font-semibold">Language &amp; Labels</h1>

      {/* Section A: Behaviour labels */}
      <section>
        <h2 className="mb-3 text-base font-semibold">Behaviour labels</h2>
        <form action={saveBehaviourLabels} className="space-y-3">
          <div className="grid max-w-lg gap-3">
            {BEHAVIOUR_FIELDS.map((field) => (
              <div key={field.key} className="flex items-center gap-3">
                <label className="w-52 text-sm text-slate-600">{field.label}</label>
                <input
                  name={field.key}
                  defaultValue={settings?.[field.key] ?? field.default}
                  placeholder={field.default}
                  className="flex-1 rounded border p-2 text-sm"
                />
              </div>
            ))}
          </div>
          <button className="rounded bg-slate-900 px-4 py-2 text-sm text-white" type="submit">
            Save behaviour labels
          </button>
        </form>
      </section>

      {/* Section B: Signal labels */}
      <section>
        <h2 className="mb-3 text-base font-semibold">Observation signal labels</h2>
        <form action={saveSignalLabels} className="space-y-2">
          <table className="w-full border bg-white text-sm">
            <thead>
              <tr className="border-b">
                <th className="p-2 text-left">Signal</th>
                <th className="p-2 text-left">Default name</th>
                <th className="p-2 text-left">Display name</th>
                <th className="p-2 text-left">Description</th>
                <th className="p-2" />
              </tr>
            </thead>
            <tbody>
              {SIGNAL_DEFINITIONS.map((signal) => {
                const override = signalLabels[signal.key];
                return (
                  <tr className="border-b align-top" key={signal.key}>
                    <td className="p-2 font-mono text-xs">{signal.key}</td>
                    <td className="p-2">{signal.displayNameDefault}</td>
                    <td className="p-2">
                      <input
                        name={`display_${signal.key}`}
                        defaultValue={override?.displayName || signal.displayNameDefault}
                        minLength={2}
                        maxLength={80}
                        required
                        className="w-full rounded border p-1"
                      />
                    </td>
                    <td className="p-2">
                      <textarea
                        name={`description_${signal.key}`}
                        defaultValue={override?.description ?? signal.descriptionDefault}
                        maxLength={240}
                        rows={2}
                        className="w-full rounded border p-1"
                      />
                    </td>
                    <td className="p-2 text-center">
                      <button formAction={resetSignal} name="signalKey" value={signal.key} type="submit" className="text-xs underline">
                        Reset
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <button className="rounded bg-slate-900 px-4 py-2 text-sm text-white" type="submit">
            Save signal labels
          </button>
        </form>
      </section>
    </div>
  );
}
