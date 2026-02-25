import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/lib/admin";
import { revalidatePath } from "next/cache";

const REQUIRED_KEYS = ["positive_points", "detentions", "internal_exclusions", "on_calls", "suspensions"];

export default async function AdminVocabPage() {
  const user = await requireAdminUser();
  const vocab = await prisma.tenantVocab.findMany({ where: { tenantId: user.tenantId }, orderBy: { key: "asc" } });

  async function saveVocab(formData: FormData) {
    "use server";
    const admin = await requireAdminUser();
    for (const key of REQUIRED_KEYS) {
      const singular = String(formData.get(`${key}_singular`) || "");
      const plural = String(formData.get(`${key}_plural`) || "");
      await prisma.tenantVocab.upsert({
        where: { tenantId_key: { tenantId: admin.tenantId, key } },
        create: { tenantId: admin.tenantId, key, labelSingular: singular, labelPlural: plural },
        update: { labelSingular: singular, labelPlural: plural }
      });
    }
    revalidatePath("/tenant/admin/vocab");
  }

  const byKey = new Map<string, any>((vocab as any[]).map((v: any) => [v.key, v]));

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Vocabulary</h1>
      <form action={saveVocab} className="space-y-3">
        {REQUIRED_KEYS.map((key) => {
          const row = byKey.get(key);
          return (
            <div key={key} className="grid grid-cols-3 gap-2 rounded border bg-white p-3">
              <div className="font-medium">{key}</div>
              <input className="border p-2" name={`${key}_singular`} defaultValue={row?.labelSingular || ""} placeholder="Singular" />
              <input className="border p-2" name={`${key}_plural`} defaultValue={row?.labelPlural || ""} placeholder="Plural" />
            </div>
          );
        })}
        <button className="rounded bg-slate-900 px-3 py-2 text-white" type="submit">Save labels</button>
      </form>
    </div>
  );
}
