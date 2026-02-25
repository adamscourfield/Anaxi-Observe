import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { SIGNAL_DEFINITIONS } from "../modules/observations/signalDefinitions";

const prisma = new PrismaClient();
const FEATURES = [
  "OBSERVATIONS", "SIGNALS", "STUDENTS", "STUDENTS_IMPORT", "BEHAVIOUR_IMPORT",
  "LEAVE", "LEAVE_OF_ABSENCE", "ON_CALL", "MEETINGS", "TIMETABLE", "ADMIN", "ADMIN_SETTINGS",
  "ANALYSIS"
] as const;

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

  // Demo teachers for analysis
  const demoTeachers = [
    { email: "alice@demo.school", fullName: "Alice Thornton", role: "TEACHER" },
    { email: "ben@demo.school", fullName: "Ben Okafor", role: "TEACHER" },
    { email: "chloe@demo.school", fullName: "Chloe Davies", role: "TEACHER" },
  ];
  const teacherRecords: Record<string, any> = {};
  for (const t of demoTeachers) {
    teacherRecords[t.email] = await (prisma as any).user.upsert({
      where: { tenantId_email: { tenantId: tenant.id, email: t.email } },
      update: { fullName: t.fullName, role: t.role, isActive: true, passwordHash },
      create: { tenantId: tenant.id, email: t.email, fullName: t.fullName, role: t.role, isActive: true, passwordHash }
    });
  }

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

  for (const signal of SIGNAL_DEFINITIONS) {
    await (prisma as any).tenantSignalLabel.upsert({
      where: { tenantId_signalKey: { tenantId: tenant.id, signalKey: signal.key } },
      update: { displayName: signal.displayNameDefault, description: signal.descriptionDefault },
      create: { tenantId: tenant.id, signalKey: signal.key, displayName: signal.displayNameDefault, description: signal.descriptionDefault }
    });
  }

  // ─── Demo observations for Teacher Risk Index ─────────────────────────────
  // Seed observations so the Analysis page is populated in the demo environment.
  // Alice: stable (all CONSISTENT in both windows)
  // Ben: emerging drift (slight drop on 3 signals)
  // Chloe: low coverage (only 2 observations in current window)

  const now = new Date();
  const daysAgo = (d: number) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000);

  // Helper to build signal data for an observation
  const allSignalKeys = SIGNAL_DEFINITIONS.map((s) => s.key);
  const makeSignals = (overrides: Partial<Record<string, string>> = {}) =>
    allSignalKeys.map((k) => ({ signalKey: k, valueKey: overrides[k] ?? "CONSISTENT", notObserved: false }));

  const aliceId = teacherRecords["alice@demo.school"].id;
  const benId = teacherRecords["ben@demo.school"].id;
  const chloeId = teacherRecords["chloe@demo.school"].id;

  // Alice — 7 current + 7 prev, all CONSISTENT → STABLE
  for (let i = 0; i < 7; i++) {
    await (prisma as any).observation.create({
      data: {
        tenantId: tenant.id, observedTeacherId: aliceId, observerId: adminUser.id,
        observedAt: daysAgo(i + 1), yearGroup: "Y10", subject: "Maths", phase: "INSTRUCTION",
        signals: { createMany: { data: makeSignals() } }
      }
    });
  }
  for (let i = 0; i < 7; i++) {
    await (prisma as any).observation.create({
      data: {
        tenantId: tenant.id, observedTeacherId: aliceId, observerId: adminUser.id,
        observedAt: daysAgo(22 + i), yearGroup: "Y10", subject: "Maths", phase: "INSTRUCTION",
        signals: { createMany: { data: makeSignals() } }
      }
    });
  }

  // Ben — 7 current (some LIMITED on key signals) + 7 prev (CONSISTENT) → EMERGING_DRIFT
  for (let i = 0; i < 7; i++) {
    await (prisma as any).observation.create({
      data: {
        tenantId: tenant.id, observedTeacherId: benId, observerId: adminUser.id,
        observedAt: daysAgo(i + 1), yearGroup: "Y9", subject: "English", phase: "GUIDED_PRACTICE",
        signals: {
          createMany: {
            data: makeSignals({
              BEHAVIOUR_CLIMATE: i < 4 ? "SOME" : "CONSISTENT",
              CFU_CYCLES: i < 4 ? "LIMITED" : "SOME",
              COLD_CALL_DENSITY: i < 3 ? "LIMITED" : "SOME",
            })
          }
        }
      }
    });
  }
  for (let i = 0; i < 7; i++) {
    await (prisma as any).observation.create({
      data: {
        tenantId: tenant.id, observedTeacherId: benId, observerId: adminUser.id,
        observedAt: daysAgo(22 + i), yearGroup: "Y9", subject: "English", phase: "GUIDED_PRACTICE",
        signals: { createMany: { data: makeSignals() } }
      }
    });
  }

  // Chloe — only 2 observations → LOW_COVERAGE
  for (let i = 0; i < 2; i++) {
    await (prisma as any).observation.create({
      data: {
        tenantId: tenant.id, observedTeacherId: chloeId, observerId: adminUser.id,
        observedAt: daysAgo(i + 3), yearGroup: "Y8", subject: "Science", phase: "UNKNOWN",
        signals: { createMany: { data: makeSignals() } }
      }
    });
  }
}

main().finally(async () => prisma.$disconnect());
