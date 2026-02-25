import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/lib/admin";
import { revalidatePath } from "next/cache";
import { SIGNAL_DEFINITIONS } from "@/modules/observations/signalDefinitions";
import { upsertTenantSignalLabel } from "@/modules/observations/tenantSignalLabels";
import { redirect as nextRedirect } from "next/navigation";
import WizardClient from "./wizard-client";

const ALL_MODULES = [
  { key: "OBSERVATIONS", label: "Observations" },
  { key: "SIGNALS", label: "Signals" },
  { key: "STUDENTS", label: "Students" },
  { key: "BEHAVIOUR_IMPORT", label: "Behaviour Import" },
  { key: "ON_CALL", label: "On Call" },
  { key: "MEETINGS", label: "Meetings" },
  { key: "LEAVE_OF_ABSENCE", label: "Leave of Absence" },
  { key: "TIMETABLE", label: "Timetable" },
  { key: "ADMIN_SETTINGS", label: "Admin Settings" },
] as const;

const BEHAVIOUR_FIELDS = [
  { key: "positivePointsLabel", label: "Positive points", default: "Positive Points" },
  { key: "detentionLabel", label: "Detention", default: "Detention" },
  { key: "internalExclusionLabel", label: "Internal exclusion", default: "Internal Exclusion" },
  { key: "suspensionLabel", label: "Suspension", default: "Suspension" },
  { key: "onCallLabel", label: "On call", default: "On Call" },
] as const;

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: { step?: string };
}) {
  const user = await requireAdminUser();
  const step = parseInt(searchParams?.step ?? "1");

  const settings = await (prisma as any).tenantSettings.findUnique({ where: { tenantId: user.tenantId } });
  const features = await prisma.tenantFeature.findMany({ where: { tenantId: user.tenantId } });
  const enabledKeys = new Set(features.filter((f: any) => f.enabled).map((f: any) => f.key));

  // ── Step 1: School settings ──────────────────────────────────────────────────
  async function saveSchoolSettings(formData: FormData) {
    "use server";
    const admin = await requireAdminUser();
    const schoolName = String(formData.get("schoolName") || "").trim();
    const timezone = String(formData.get("timezone") || "Europe/London");
    await (prisma as any).tenantSettings.upsert({
      where: { tenantId: admin.tenantId },
      update: { schoolName, timezone },
      create: { tenantId: admin.tenantId, schoolName, timezone }
    });
    // Also update tenant name
    if (schoolName) {
      await prisma.tenant.update({ where: { id: admin.tenantId }, data: { name: schoolName } });
    }
    nextRedirect("/tenant/onboarding?step=2");
  }

  // ── Step 2: Enable modules ───────────────────────────────────────────────────
  async function saveModules(formData: FormData) {
    "use server";
    const admin = await requireAdminUser();
    for (const mod of ALL_MODULES) {
      const enabled = formData.get(mod.key) === "on";
      await prisma.tenantFeature.upsert({
        where: { tenantId_key: { tenantId: admin.tenantId, key: mod.key } },
        update: { enabled },
        create: { tenantId: admin.tenantId, key: mod.key, enabled }
      });
    }
    nextRedirect("/tenant/onboarding?step=3");
  }

  // ── Step 3: Staff import info (redirect to import page) ──────────────────────
  // ── Step 4: Behaviour labels ─────────────────────────────────────────────────
  async function saveBehaviourLabels(formData: FormData) {
    "use server";
    const admin = await requireAdminUser();
    const data: Record<string, string> = {};
    for (const f of BEHAVIOUR_FIELDS) {
      data[f.key] = String(formData.get(f.key) || f.default).trim() || f.default;
    }
    await (prisma as any).tenantSettings.upsert({
      where: { tenantId: admin.tenantId },
      update: data,
      create: { tenantId: admin.tenantId, ...data }
    });
    nextRedirect("/tenant/onboarding?step=5");
  }

  // ── Step 5: Signal labels ────────────────────────────────────────────────────
  async function saveSignalLabels(formData: FormData) {
    "use server";
    const admin = await requireAdminUser();
    for (const signal of SIGNAL_DEFINITIONS) {
      const displayName = String(formData.get(`display_${signal.key}`) || signal.displayNameDefault).trim();
      const description = String(formData.get(`description_${signal.key}`) || "");
      await upsertTenantSignalLabel(admin.tenantId, signal.key, displayName || signal.displayNameDefault, description);
    }
    nextRedirect("/tenant/onboarding?step=6");
  }

  // ── Step 7: Finish ───────────────────────────────────────────────────────────
  async function finishOnboarding() {
    "use server";
    const admin = await requireAdminUser();
    await (prisma as any).tenantSettings.upsert({
      where: { tenantId: admin.tenantId },
      update: { onboardingCompletedAt: new Date() },
      create: { tenantId: admin.tenantId, onboardingCompletedAt: new Date() }
    });
    nextRedirect("/tenant");
  }

  const tenant = await prisma.tenant.findUnique({ where: { id: user.tenantId } });

  return (
    <WizardClient stepIndex={step - 1}>
      {step === 1 && (
        <form action={saveSchoolSettings} className="space-y-4">
          <h2 className="font-semibold">Step 1: School settings</h2>
          <div>
            <label className="mb-1 block text-sm">School name</label>
            <input
              name="schoolName"
              defaultValue={settings?.schoolName ?? tenant?.name ?? ""}
              placeholder="My School"
              className="w-full max-w-sm rounded border p-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm">Timezone</label>
            <select name="timezone" defaultValue={settings?.timezone ?? "Europe/London"} className="rounded border p-2 text-sm">
              <option value="Europe/London">Europe/London</option>
              <option value="Europe/Dublin">Europe/Dublin</option>
              <option value="America/New_York">America/New_York</option>
              <option value="America/Chicago">America/Chicago</option>
              <option value="America/Los_Angeles">America/Los_Angeles</option>
              <option value="Australia/Sydney">Australia/Sydney</option>
            </select>
          </div>
          <button type="submit" className="rounded bg-slate-900 px-4 py-2 text-sm text-white">
            Next →
          </button>
        </form>
      )}

      {step === 2 && (
        <form action={saveModules} className="space-y-4">
          <h2 className="font-semibold">Step 2: Enable modules</h2>
          <div className="grid grid-cols-2 gap-2">
            {ALL_MODULES.map((mod) => (
              <label key={mod.key} className="flex items-center gap-2 rounded border bg-white p-3 text-sm">
                <input
                  type="checkbox"
                  name={mod.key}
                  defaultChecked={enabledKeys.has(mod.key)}
                />
                {mod.label}
              </label>
            ))}
          </div>
          <div className="flex gap-2">
            <a href="/tenant/onboarding?step=1" className="rounded border px-4 py-2 text-sm">← Back</a>
            <button type="submit" className="rounded bg-slate-900 px-4 py-2 text-sm text-white">Next →</button>
          </div>
        </form>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <h2 className="font-semibold">Step 3: Upload staff</h2>
          <p className="text-sm text-slate-600">
            Use the Users admin page to bulk-import or add staff manually. Come back here when done.
          </p>
          <div className="flex gap-2">
            <a href="/tenant/onboarding?step=2" className="rounded border px-4 py-2 text-sm">← Back</a>
            <a href="/tenant/admin/users" className="rounded bg-slate-700 px-4 py-2 text-sm text-white">Go to Users</a>
            <a href="/tenant/onboarding?step=4" className="rounded bg-slate-900 px-4 py-2 text-sm text-white">Next →</a>
          </div>
        </div>
      )}

      {step === 4 && (
        <form action={saveBehaviourLabels} className="space-y-4">
          <h2 className="font-semibold">Step 4: Behaviour labels</h2>
          <div className="grid max-w-lg gap-3">
            {BEHAVIOUR_FIELDS.map((field) => (
              <div key={field.key} className="flex items-center gap-3">
                <label className="w-52 text-sm text-slate-600">{field.label}</label>
                <input
                  name={field.key}
                  defaultValue={settings?.[field.key] ?? field.default}
                  placeholder={field.default}
                  className="flex-1 rounded border p-2 text-sm"
                />
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <a href="/tenant/onboarding?step=3" className="rounded border px-4 py-2 text-sm">← Back</a>
            <button type="submit" className="rounded bg-slate-900 px-4 py-2 text-sm text-white">Next →</button>
          </div>
        </form>
      )}

      {step === 5 && (
        <form action={saveSignalLabels} className="space-y-4">
          <h2 className="font-semibold">Step 5: Signal labels</h2>
          <p className="text-sm text-slate-600">Customise observation signal display names for your school's language.</p>
          <div className="overflow-x-auto">
            <table className="w-full border bg-white text-sm">
              <thead>
                <tr className="border-b">
                  <th className="p-2 text-left">Signal</th>
                  <th className="p-2 text-left">Display name</th>
                  <th className="p-2 text-left">Description (optional)</th>
                </tr>
              </thead>
              <tbody>
                {SIGNAL_DEFINITIONS.map((signal) => (
                  <tr className="border-b align-top" key={signal.key}>
                    <td className="p-2 font-mono text-xs">{signal.key}</td>
                    <td className="p-2">
                      <input
                        name={`display_${signal.key}`}
                        defaultValue={signal.displayNameDefault}
                        className="w-full rounded border p-1"
                        required
                      />
                    </td>
                    <td className="p-2">
                      <input
                        name={`description_${signal.key}`}
                        defaultValue={signal.descriptionDefault}
                        className="w-full rounded border p-1"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex gap-2">
            <a href="/tenant/onboarding?step=4" className="rounded border px-4 py-2 text-sm">← Back</a>
            <button type="submit" className="rounded bg-slate-900 px-4 py-2 text-sm text-white">Next →</button>
          </div>
        </form>
      )}

      {step === 6 && (
        <div className="space-y-4">
          <h2 className="font-semibold">Step 6: Timetable upload (optional)</h2>
          <p className="text-sm text-slate-600">
            Optionally upload a timetable CSV. This can be done later from the Admin panel.
          </p>
          <div className="flex gap-2">
            <a href="/tenant/onboarding?step=5" className="rounded border px-4 py-2 text-sm">← Back</a>
            <a href="/tenant/admin/timetable" className="rounded bg-slate-700 px-4 py-2 text-sm text-white">Upload timetable</a>
            <a href="/tenant/onboarding?step=7" className="rounded bg-slate-900 px-4 py-2 text-sm text-white">Skip →</a>
          </div>
        </div>
      )}

      {step === 7 && (
        <div className="space-y-4">
          <h2 className="font-semibold">Step 7: All done! 🎉</h2>
          <p className="text-sm text-slate-600">
            Your school is set up. You can always revisit any settings from the Admin panel.
          </p>
          <form action={finishOnboarding}>
            <button type="submit" className="rounded bg-slate-900 px-6 py-2 text-sm text-white">
              Go to dashboard →
            </button>
          </form>
        </div>
      )}
    </WizardClient>
  );
}
