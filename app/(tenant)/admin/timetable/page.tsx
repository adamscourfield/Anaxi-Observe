import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/lib/admin";
import { revalidatePath } from "next/cache";

export default async function AdminTimetablePage() {
  const user = await requireAdminUser();

  const lastJob = await (prisma as any).timetableImportJob.findFirst({
    where: { tenantId: user.tenantId },
    orderBy: { createdAt: "desc" }
  });

  const entryCount = await (prisma as any).timetableEntry.count({ where: { tenantId: user.tenantId } });

  const conflictCount = await (prisma as any).timetableEntry.count({
    where: { tenantId: user.tenantId, teacherUserId: null, teacherEmailRaw: { not: null } }
  });

  async function uploadTimetable(formData: FormData) {
    "use server";
    const admin = await requireAdminUser();
    const file = formData.get("file") as File | null;
    if (!file || file.size === 0) return;

    const text = await file.text();
    const lines = text.split("\n").filter(Boolean);
    if (lines.length < 2) return;

    const headerLine = lines[0];
    const headers = headerLine.split(",").map((h) => h.trim().toLowerCase());

    const idx = {
      classCode: headers.indexOf("classcode"),
      subject: headers.indexOf("subject"),
      yearGroup: headers.indexOf("yeargroup"),
      teacherEmail: headers.indexOf("teacheremail"),
      room: headers.indexOf("room"),
      dayOfWeek: headers.indexOf("dayofweek"),
      period: headers.indexOf("period"),
    };

    if (idx.classCode < 0 || idx.subject < 0 || idx.yearGroup < 0) return;

    const allUsers = await (prisma as any).user.findMany({
      where: { tenantId: admin.tenantId },
      select: { id: true, email: true }
    });
    const userByEmail = new Map<string, string>(
      (allUsers as any[]).map((u: any) => [u.email.toLowerCase(), u.id])
    );

    const importJob = await (prisma as any).timetableImportJob.create({
      data: {
        tenantId: admin.tenantId,
        status: "PROCESSING",
        uploadedByUserId: admin.id,
        fileName: file.name,
        rowCount: lines.length - 1
      }
    });

    // Clear existing entries for this tenant
    await (prisma as any).timetableEntry.deleteMany({ where: { tenantId: admin.tenantId } });

    let processed = 0;
    let failed = 0;
    const errors: Array<{ row: number; message: string }> = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(",").map((c) => c.trim());
      const classCode = cols[idx.classCode] || "";
      const subject = cols[idx.subject] || "";
      const yearGroup = cols[idx.yearGroup] || "";

      if (!classCode || !subject || !yearGroup) {
        failed++;
        errors.push({ row: i + 1, message: "Missing required fields (ClassCode, Subject, YearGroup)" });
        continue;
      }

      const rawEmail = idx.teacherEmail >= 0 ? (cols[idx.teacherEmail] || "").toLowerCase() : null;
      const teacherUserId = rawEmail ? (userByEmail.get(rawEmail) ?? null) : null;

      if (rawEmail && !teacherUserId) {
        errors.push({ row: i + 1, message: `Teacher email not found: ${rawEmail}` });
      }

      await (prisma as any).timetableEntry.create({
        data: {
          tenantId: admin.tenantId,
          classCode,
          subject,
          yearGroup,
          teacherUserId,
          teacherEmailRaw: rawEmail || null,
          room: idx.room >= 0 ? (cols[idx.room] || null) : null,
          dayOfWeek: idx.dayOfWeek >= 0 ? (parseInt(cols[idx.dayOfWeek]) || null) : null,
          period: idx.period >= 0 ? (cols[idx.period] || null) : null
        }
      });
      processed++;
    }

    await (prisma as any).timetableImportJob.update({
      where: { id: importJob.id },
      data: {
        status: "COMPLETED",
        rowsProcessed: processed,
        rowsFailed: failed,
        errorReportJson: errors.length > 0 ? errors : null,
        finishedAt: new Date()
      }
    });

    revalidatePath("/tenant/admin/timetable");
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Timetable</h1>

      <div className="flex gap-6 text-sm">
        <div className="rounded border bg-white p-3 shadow-sm">
          <div className="text-2xl font-bold">{entryCount}</div>
          <div className="text-slate-500">Total entries</div>
        </div>
        <div className="rounded border bg-white p-3 shadow-sm">
          <div className="text-2xl font-bold text-amber-600">{conflictCount}</div>
          <div className="text-slate-500">Unresolved conflicts</div>
        </div>
        {lastJob && (
          <div className="rounded border bg-white p-3 shadow-sm">
            <div className="font-medium">{lastJob.status}</div>
            <div className="text-slate-500">
              Last import: {new Date(lastJob.createdAt).toLocaleDateString()}
            </div>
            <div className="text-slate-500">{lastJob.rowsProcessed} rows processed, {lastJob.rowsFailed} failed</div>
          </div>
        )}
      </div>

      <div className="rounded border bg-white p-4 shadow-sm">
        <h2 className="mb-3 font-semibold">Upload timetable CSV</h2>
        <p className="mb-3 text-sm text-slate-600">
          Required columns: <code>ClassCode</code>, <code>Subject</code>, <code>YearGroup</code>
          <br />
          Optional columns: <code>TeacherEmail</code>, <code>Room</code>, <code>DayOfWeek</code>, <code>Period</code>
        </p>
        <form action={uploadTimetable} encType="multipart/form-data" className="flex gap-3">
          <input type="file" name="file" accept=".csv" className="text-sm" required />
          <button type="submit" className="rounded bg-slate-900 px-4 py-2 text-sm text-white">
            Upload &amp; import
          </button>
        </form>
      </div>

      {lastJob?.errorReportJson && (
        <div className="rounded border border-amber-200 bg-amber-50 p-4">
          <h3 className="mb-2 font-semibold text-amber-800">Import conflicts / errors</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="p-1 text-left">Row</th>
                <th className="p-1 text-left">Message</th>
              </tr>
            </thead>
            <tbody>
              {(lastJob.errorReportJson as Array<{ row: number; message: string }>).map((e, i) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="p-1">{e.row}</td>
                  <td className="p-1">{e.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
