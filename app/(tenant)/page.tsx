import { getSessionUserOrThrow } from "@/lib/auth";

export default async function TenantHome() {
  const user = await getSessionUserOrThrow();
  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold">Welcome, {user.fullName}</h1>
      <p>Role: {user.role}</p>
      <p>Tenant context is active for all module pages.</p>
    </div>
  );
}
