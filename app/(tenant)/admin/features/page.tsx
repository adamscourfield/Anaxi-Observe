import { redirect } from "next/navigation";

export default function AdminFeaturesPage() {
  redirect("/tenant/admin/settings?tab=modules");
}
