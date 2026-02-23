export default function SubjectTeacherImportPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Import student subject teachers</h1>
      <form action="/api/students/import-subject-teachers" method="post" encType="multipart/form-data" className="space-y-3 rounded border bg-white p-4">
        <input type="file" name="file" accept=".csv" required />
        <button className="rounded bg-slate-900 px-3 py-2 text-white" type="submit">Upload and process</button>
      </form>
      <p className="text-sm">Required columns: UPN, Subject, TeacherEmail, EffectiveFrom, EffectiveTo(optional).</p>
    </div>
  );
}
