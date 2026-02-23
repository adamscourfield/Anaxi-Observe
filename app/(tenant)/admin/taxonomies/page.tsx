import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/lib/admin";
import { revalidatePath } from "next/cache";

const TABS = ["loa-reasons", "loa-authorisers", "on-call-reasons", "on-call-locations", "on-call-recipients"] as const;
type Tab = (typeof TABS)[number];

export default async function AdminTaxonomiesPage({ searchParams }: { searchParams?: { tab?: string } }) {
  const user = await requireAdminUser();
  const tab = (TABS.includes((searchParams?.tab as Tab) || "loa-reasons") ? (searchParams?.tab as Tab) : "loa-reasons") as Tab;

  const [loaReasons, onCallReasons, locations, recipients, staff, loaAuthorisers] = await Promise.all([
    prisma.loaReason.findMany({ where: { tenantId: user.tenantId }, orderBy: { label: "asc" } }),
    (prisma as any).onCallReason.findMany({ where: { tenantId: user.tenantId }, orderBy: { label: "asc" } }),
    (prisma as any).onCallLocation.findMany({ where: { tenantId: user.tenantId }, orderBy: { label: "asc" } }),
    (prisma as any).onCallRecipient.findMany({ where: { tenantId: user.tenantId }, orderBy: { email: "asc" } }),
    (prisma as any).user.findMany({ where: { tenantId: user.tenantId, isActive: true }, orderBy: { fullName: "asc" } }),
    (prisma as any).lOAAuthoriser.findMany({ where: { tenantId: user.tenantId }, include: { user: true } })
  ]);

  async function addItem(formData: FormData) {
    "use server";
    const admin = await requireAdminUser();
    const type = String(formData.get("type"));
    const value = String(formData.get("value") || "").trim();
    if (!value) return;
    if (type === "loa") await prisma.loaReason.create({ data: { tenantId: admin.tenantId, label: value } });
    if (type === "reason") await (prisma as any).onCallReason.create({ data: { tenantId: admin.tenantId, label: value } });
    if (type === "location") await (prisma as any).onCallLocation.create({ data: { tenantId: admin.tenantId, label: value } });
    if (type === "recipient") await (prisma as any).onCallRecipient.create({ data: { tenantId: admin.tenantId, email: value } });
    if (type === "loa_authoriser") {
      await (prisma as any).lOAAuthoriser.upsert({
        where: { tenantId_userId: { tenantId: admin.tenantId, userId: value } },
        update: {},
        create: { tenantId: admin.tenantId, userId: value }
      });
    }
    revalidatePath("/tenant/admin/taxonomies");
  }

  async function updateItem(formData: FormData) {
    "use server";
    const admin = await requireAdminUser();
    const type = String(formData.get("type"));
    const id = String(formData.get("id"));
    const label = String(formData.get("label") || "").trim();
    if (!id) return;

    if (type === "loa") await prisma.loaReason.updateMany({ where: { id, tenantId: admin.tenantId }, data: { label } });
    if (type === "reason") await (prisma as any).onCallReason.updateMany({ where: { id, tenantId: admin.tenantId }, data: { label } });
    if (type === "location") await (prisma as any).onCallLocation.updateMany({ where: { id, tenantId: admin.tenantId }, data: { label } });
    if (type === "recipient") await (prisma as any).onCallRecipient.updateMany({ where: { id, tenantId: admin.tenantId }, data: { email: label } });
    revalidatePath("/tenant/admin/taxonomies");
  }

  async function toggleActive(formData: FormData) {
    "use server";
    const admin = await requireAdminUser();
    const type = String(formData.get("type"));
    const id = String(formData.get("id"));
    const active = String(formData.get("active")) === "true";
    if (!id) return;

    if (type === "loa") await prisma.loaReason.updateMany({ where: { id, tenantId: admin.tenantId }, data: { active: !active } });
    if (type === "reason") await (prisma as any).onCallReason.updateMany({ where: { id, tenantId: admin.tenantId }, data: { active: !active } });
    if (type === "location") await (prisma as any).onCallLocation.updateMany({ where: { id, tenantId: admin.tenantId }, data: { active: !active } });
    if (type === "recipient") await (prisma as any).onCallRecipient.updateMany({ where: { id, tenantId: admin.tenantId }, data: { active: !active } });
    revalidatePath("/tenant/admin/taxonomies");
  }

  async function removeAuthoriser(formData: FormData) {
    "use server";
    const admin = await requireAdminUser();
    const id = String(formData.get("id"));
    await (prisma as any).lOAAuthoriser.deleteMany({ where: { id, tenantId: admin.tenantId } });
    revalidatePath("/tenant/admin/taxonomies");
  }

  const tabLink = (value: Tab, label: string) => (
    <Link key={value} href={`/tenant/admin/taxonomies?tab=${value}`} className={`rounded border px-3 py-1 text-sm ${tab === value ? "bg-slate-900 text-white" : "bg-white"}`}>
      {label}
    </Link>
  );

  const editableTaxonomy = (title: string, type: string, rows: any[], field: "label" | "email") => (
    <div className="rounded border bg-white p-3">
      <h2 className="mb-2 font-medium">{title}</h2>
      <div className="space-y-2">
        {rows.map((row) => (
          <div key={row.id} className="flex items-center gap-2 text-sm">
            <form action={updateItem} className="flex flex-1 gap-2">
              <input type="hidden" name="type" value={type} />
              <input type="hidden" name="id" value={row.id} />
              <input name="label" defaultValue={row[field]} className="flex-1 border p-2" required />
              <button className="rounded bg-slate-900 px-3 py-2 text-white" type="submit">Save</button>
            </form>
            <form action={toggleActive}>
              <input type="hidden" name="type" value={type} />
              <input type="hidden" name="id" value={row.id} />
              <input type="hidden" name="active" value={String(row.active)} />
              <button className="rounded border px-3 py-2" type="submit">{row.active ? "Deactivate" : "Activate"}</button>
            </form>
          </div>
        ))}
        {rows.length === 0 ? <p className="text-sm text-slate-600">No items yet.</p> : null}
      </div>
      <form action={addItem} className="mt-3 flex gap-2">
        <input type="hidden" name="type" value={type} />
        <input name="value" className="flex-1 border p-2" placeholder={`Add ${title.slice(0, -1).toLowerCase()}`} />
        <button className="rounded bg-slate-900 px-3 py-2 text-white" type="submit">Add</button>
      </form>
    </div>
  );

  return (
    <div className="space-y-3">
      <h1 className="text-xl font-semibold">Taxonomies</h1>
      <div className="flex flex-wrap gap-2">
        {tabLink("loa-reasons", "LOA Reasons")}
        {tabLink("loa-authorisers", "LOA Authorisers")}
        {tabLink("on-call-reasons", "On Call Reasons")}
        {tabLink("on-call-locations", "On Call Locations")}
        {tabLink("on-call-recipients", "On Call Recipients")}
      </div>

      {tab === "loa-reasons" ? editableTaxonomy("LOA Reasons", "loa", loaReasons as any[], "label") : null}
      {tab === "on-call-reasons" ? editableTaxonomy("On Call Reasons", "reason", onCallReasons as any[], "label") : null}
      {tab === "on-call-locations" ? editableTaxonomy("On Call Locations", "location", locations as any[], "label") : null}
      {tab === "on-call-recipients" ? editableTaxonomy("On Call Recipients", "recipient", recipients as any[], "email") : null}

      {tab === "loa-authorisers" ? (
        <div className="rounded border bg-white p-3">
          <h2 className="mb-2 font-medium">LOA Authorisers</h2>
          <ul className="mb-2 space-y-2 text-sm">
            {(loaAuthorisers as any[]).map((row) => (
              <li className="flex items-center justify-between" key={row.id}>
                <span>{row.user?.fullName} ({row.user?.email})</span>
                <form action={removeAuthoriser}>
                  <input type="hidden" name="id" value={row.id} />
                  <button className="rounded border px-3 py-1" type="submit">Remove</button>
                </form>
              </li>
            ))}
            {loaAuthorisers.length === 0 ? <li className="text-slate-600">No authorisers configured.</li> : null}
          </ul>
          <form action={addItem} className="flex gap-2">
            <input type="hidden" name="type" value="loa_authoriser" />
            <select name="value" className="flex-1 border p-2" required>
              <option value="">Add authoriser...</option>
              {(staff as any[]).map((staffUser) => (
                <option value={staffUser.id} key={staffUser.id}>{staffUser.fullName} ({staffUser.email})</option>
              ))}
            </select>
            <button className="rounded bg-slate-900 px-3 py-2 text-white" type="submit">Add</button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
