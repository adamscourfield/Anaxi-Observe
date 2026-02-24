import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const FEATURES = ["OBSERVATIONS", "STUDENTS", "STUDENTS_IMPORT", "LEAVE", "ON_CALL", "MEETINGS", "ADMIN"] as const;

async function main() {
  const tenant = await prisma.tenant.upsert({
    where: { id: "tenant_demo" },
    update: { name: "Demo School" },
    create: { id: "tenant_demo", name: "Demo School" }
  });

  const passwordHash = await bcrypt.hash("Password123!", 10);
  const adminUser = await (prisma as any).user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: "admin@demo.school" } },
    update: { fullName: "Admin User", role: "ADMIN", isActive: true, canApproveAllLoa: true, receivesOnCallEmails: true, passwordHash },
    create: { tenantId: tenant.id, email: "admin@demo.school", fullName: "Admin User", role: "ADMIN", isActive: true, canApproveAllLoa: true, receivesOnCallEmails: true, passwordHash }
  });

  for (const key of FEATURES) {
    await (prisma as any).tenantFeature.upsert({
      where: { tenantId_key: { tenantId: tenant.id, key } },
      update: { enabled: true },
      create: { tenantId: tenant.id, key, enabled: true }
    });
  }

  const vocabRows = [
    ["positive_points", "Positive Point", "Positive Points"],
    ["detentions", "Detention", "Detentions"],
    ["internal_exclusions", "Internal Exclusion", "Internal Exclusions"],
    ["on_calls", "On Call", "On Calls"],
    ["suspensions", "Suspension", "Suspensions"]
  ] as const;

  for (const [key, singular, plural] of vocabRows) {
    await (prisma as any).tenantVocab.upsert({
      where: { tenantId_key: { tenantId: tenant.id, key } },
      update: { labelSingular: singular, labelPlural: plural },
      create: { tenantId: tenant.id, key, labelSingular: singular, labelPlural: plural }
    });
  }

  for (const label of ["Medical", "Family", "Training"]) {
    await (prisma as any).loaReason.upsert({ where: { tenantId_label: { tenantId: tenant.id, label } }, update: {}, create: { tenantId: tenant.id, label } });
  }
  await (prisma as any).lOAAuthoriser.upsert({
    where: { tenantId_userId: { tenantId: tenant.id, userId: adminUser.id } },
    update: {},
    create: { tenantId: tenant.id, userId: adminUser.id }
  });
  for (const name of ["Behaviour disruption", "Safeguarding", "Urgent support"]) {
    await (prisma as any).onCallReason.upsert({ where: { tenantId_label: { tenantId: tenant.id, label: name } }, update: {}, create: { tenantId: tenant.id, label: name } });
  }
  for (const name of ["Hallway", "Playground", "Canteen"]) {
    await (prisma as any).onCallLocation.upsert({ where: { tenantId_label: { tenantId: tenant.id, label: name } }, update: {}, create: { tenantId: tenant.id, label: name } });
  }
  for (const email of ["oncall@demo.school", "pastoral@demo.school"]) {
    await (prisma as any).onCallRecipient.upsert({ where: { tenantId_email: { tenantId: tenant.id, email } }, update: {}, create: { tenantId: tenant.id, email } });
  }
}

main().finally(async () => prisma.$disconnect());
