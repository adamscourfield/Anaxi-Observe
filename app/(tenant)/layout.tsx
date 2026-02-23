import { prisma } from "@/lib/prisma";
import { getSessionUserOrThrow } from "@/lib/auth";
import { TenantNav } from "@/components/tenant-nav";

export default async function TenantLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUserOrThrow();
  const features = await prisma.tenantFeature.findMany({ where: { tenantId: user.tenantId, enabled: true } });

  return (
    <div>
      <TenantNav role={user.role} enabledFeatures={features.map((f: any) => f.key as any)} />
      {children}
    </div>
  );
}
