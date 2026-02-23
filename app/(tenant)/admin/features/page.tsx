import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/lib/admin";
import { revalidatePath } from "next/cache";

export default async function AdminFeaturesPage() {
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
    revalidatePath("/tenant/admin/features");
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Features</h1>
      {features.map((f: any) => (
        <form key={f.key} action={toggleFeature} className="flex items-center gap-3 rounded border bg-white p-3">
          <input type="hidden" name="key" value={f.key} />
          <input type="hidden" name="enabled" value={String(f.enabled)} />
          <span className="w-48 font-medium">{f.key}</span>
          <span>{f.enabled ? "Enabled" : "Disabled"}</span>
          <button className="underline" type="submit">Toggle</button>
        </form>
      ))}
    </div>
  );
}
