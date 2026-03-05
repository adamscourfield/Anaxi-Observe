import Link from "next/link";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/lib/admin";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { SectionHeader } from "@/components/ui/section-header";

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
    (prisma as any).lOAAuthoriser.findMany({ where: { tenantId: user.tenantId }, include: { user: true } }),
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
        create: { tenantId: admin.tenantId, userId: value },
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
    <Link
      key={value}
      href={`/tenant/admin/taxonomies?tab=${value}`}
      className={`rounded-lg border px-3 py-1.5 text-sm calm-transition ${tab === value ? "border-transparent bg-primaryBtn text-white" : "border-border bg-surface text-text hover:bg-bg/80"}`}
    >
      {label}
    </Link>
  );

  const editableTaxonomy = (title: string, type: string, rows: any[], field: "label" | "email") => (
    <Card>
      <SectionHeader title={title} />
      <div className="mt-2 space-y-2">
        {rows.map((row) => (
          <div key={row.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-border/70 p-2 text-sm">
            <form action={updateItem} className="flex min-w-0 flex-1 gap-2">
              <input type="hidden" name="type" value={type} />
              <input type="hidden" name="id" value={row.id} />
              <input name="label" defaultValue={row[field]} className="min-w-0 flex-1 rounded-lg border border-border bg-bg px-3 py-2" required />
              <Button type="submit">Save</Button>
            </form>
            <form action={toggleActive}>
              <input type="hidden" name="type" value={type} />
              <input type="hidden" name="id" value={row.id} />
              <input type="hidden" name="active" value={String(row.active)} />
              <Button variant="secondary" type="submit">{row.active ? "Deactivate" : "Activate"}</Button>
            </form>
          </div>
        ))}
        {rows.length === 0 ? <div className="rounded-lg border border-dashed border-border/80 px-3 py-4 text-center text-sm text-muted">No items yet.</div> : null}
      </div>
      <form action={addItem} className="mt-3 flex gap-2">
        <input type="hidden" name="type" value={type} />
        <input name="value" className="flex-1 rounded-lg border border-border bg-bg px-3 py-2 text-sm" placeholder={`Add ${title.slice(0, -1).toLowerCase()}`} />
        <Button type="submit">Add</Button>
      </form>
    </Card>
  );

  return (
    <div className="space-y-4">
      <PageHeader title="Taxonomies" subtitle="Maintain configurable taxonomy values used in leave and on-call flows." />
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
        <Card>
          <SectionHeader title="LOA Authorisers" />
          <ul className="mb-2 mt-2 space-y-2 text-sm">
            {(loaAuthorisers as any[]).map((row) => (
              <li className="flex items-center justify-between gap-2 rounded-lg border border-border/70 px-3 py-2" key={row.id}>
                <span>{row.user?.fullName} ({row.user?.email})</span>
                <form action={removeAuthoriser}>
                  <input type="hidden" name="id" value={row.id} />
                  <Button variant="secondary" type="submit">Remove</Button>
                </form>
              </li>
            ))}
            {loaAuthorisers.length === 0 ? <li className="rounded-lg border border-dashed border-border/80 px-3 py-4 text-center text-sm text-muted">No authorisers configured.</li> : null}
          </ul>
          <form action={addItem} className="flex gap-2">
            <input type="hidden" name="type" value="loa_authoriser" />
            <select name="value" className="flex-1 rounded-lg border border-border bg-bg px-3 py-2 text-sm" required>
              <option value="">Add authoriser...</option>
              {(staff as any[]).map((staffUser) => (
                <option value={staffUser.id} key={staffUser.id}>{staffUser.fullName} ({staffUser.email})</option>
              ))}
            </select>
            <Button type="submit">Add</Button>
          </form>
        </Card>
      ) : null}
    </div>
  );
}
