import Link from "next/link";
import { requireAdminUser } from "@/lib/admin";

export default async function AdminIndexPage() {
  await requireAdminUser();
  return (
    <div className="space-y-3">
      <h1 className="text-xl font-semibold">Admin</h1>
      <ul className="list-disc pl-5">
        <li><Link className="underline" href="/tenant/admin/users">Users</Link></li>
        <li><Link className="underline" href="/tenant/admin/settings">Settings (Modules)</Link></li>
        <li><Link className="underline" href="/tenant/admin/features">Features</Link></li>
        <li><Link className="underline" href="/tenant/admin/vocab">Vocabulary</Link></li>
        <li><Link className="underline" href="/tenant/admin/taxonomies">Taxonomies</Link></li>
        <li><Link className="underline" href="/tenant/admin/imports">Imports</Link></li>
      </ul>
    </div>
  );
}
