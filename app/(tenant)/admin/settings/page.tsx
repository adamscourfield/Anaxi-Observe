import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/lib/admin";
import { revalidatePath } from "next/cache";

export default async function AdminSettingsPage() {
  const user = await requireAdminUser();
  const features = await prisma.tenantFeature.findMany({ where: { tenantId: user.tenantId }, orderBy: { key: "asc" } });

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
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Settings</h1>
      <p className="text-sm text-slate-600">Assign which modules are enabled for this school tenant.</p>
      {features.map((feature: any) => (
        <form key={feature.key} action={toggleFeature} className="flex items-center gap-3 rounded border bg-white p-3">
          <input type="hidden" name="key" value={feature.key} />
          <input type="hidden" name="enabled" value={String(feature.enabled)} />
          <span className="w-48 font-medium">{feature.key}</span>
          <span>{feature.enabled ? "Enabled" : "Disabled"}</span>
          <button className="underline" type="submit">Toggle</button>
        </form>
      ))}
    </div>
  );
}
