import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/lib/admin";
import { revalidatePath } from "next/cache";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";

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
      <PageHeader title="Features" subtitle="Enable or disable modules for this tenant." />
      {features.map((f: any) => (
        <Card key={f.key} className="flex items-center gap-3">
          <form action={toggleFeature} className="flex w-full flex-wrap items-center gap-3">
            <input type="hidden" name="key" value={f.key} />
            <input type="hidden" name="enabled" value={String(f.enabled)} />
            <span className="w-48 font-medium text-text">{f.key}</span>
            <span className="text-sm text-muted">{f.enabled ? "Enabled" : "Disabled"}</span>
            <Button variant="secondary" type="submit">Toggle</Button>
          </form>
        </Card>
      ))}
    </div>
  );
}
