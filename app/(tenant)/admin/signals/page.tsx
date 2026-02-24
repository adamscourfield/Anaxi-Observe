import { revalidatePath } from "next/cache";
import { requireAdminUser } from "@/lib/admin";
import { requireFeature } from "@/lib/guards";
import { SIGNAL_DEFINITIONS } from "@/modules/observations/signalDefinitions";
import { getTenantSignalLabels, upsertTenantSignalLabel } from "@/modules/observations/tenantSignalLabels";

export default async function AdminSignalsPage() {
  const user = await requireAdminUser();
  await requireFeature(user.tenantId, "OBSERVATIONS");
  const labels = await getTenantSignalLabels(user.tenantId);

  async function saveAll(formData: FormData) {
    "use server";
    const admin = await requireAdminUser();
    await requireFeature(admin.tenantId, "OBSERVATIONS");

    for (const signal of SIGNAL_DEFINITIONS) {
      const displayName = String(formData.get(`display_${signal.key}`) || signal.displayNameDefault);
      const description = String(formData.get(`description_${signal.key}`) || "");
      await upsertTenantSignalLabel(admin.tenantId, signal.key, displayName, description);
    }

    revalidatePath("/tenant/admin/signals");
    revalidatePath("/tenant/observe/new");
    revalidatePath("/tenant/observe/history");
  }

  async function resetOne(formData: FormData) {
    "use server";
    const admin = await requireAdminUser();
    await requireFeature(admin.tenantId, "OBSERVATIONS");
    const key = String(formData.get("signalKey") || "");
    const signal = SIGNAL_DEFINITIONS.find((row) => row.key === key);
    if (!signal) return;

    await upsertTenantSignalLabel(admin.tenantId, signal.key, signal.displayNameDefault, null);
    revalidatePath("/tenant/admin/signals");
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Observation Signal Language</h1>
      <form action={saveAll} className="space-y-2">
        <table className="w-full border bg-white text-sm">
          <thead>
            <tr className="border-b">
              <th className="p-2 text-left">Signal key</th>
              <th className="p-2 text-left">Default</th>
              <th className="p-2 text-left">Tenant display name</th>
              <th className="p-2 text-left">Tenant description</th>
              <th className="p-2">Reset</th>
            </tr>
          </thead>
          <tbody>
            {SIGNAL_DEFINITIONS.map((signal) => {
              const override = labels[signal.key];
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
                      className="w-full border p-2"
                    />
                  </td>
                  <td className="p-2">
                    <textarea
                      name={`description_${signal.key}`}
                      defaultValue={override?.description ?? signal.descriptionDefault}
                      maxLength={240}
                      rows={2}
                      className="w-full border p-2"
                    />
                  </td>
                  <td className="p-2 text-center">
                    <button formAction={resetOne} name="signalKey" value={signal.key} className="underline" type="submit">Reset</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <button className="rounded bg-slate-900 px-3 py-2 text-white" type="submit">Save all</button>
      </form>
    </div>
  );
}
