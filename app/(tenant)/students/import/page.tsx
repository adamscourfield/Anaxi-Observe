export default function StudentsImportPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Import student snapshots</h1>
      <form action="/api/students/import" method="post" encType="multipart/form-data" className="space-y-3 rounded border bg-white p-4">
        <input type="file" name="file" accept=".csv" required />
        <input type="date" name="snapshotDate" className="border p-2" required />
        <textarea
          name="mappingJson"
          className="h-32 w-full border p-2 font-mono text-xs"
          defaultValue={JSON.stringify({
            UPN: "UPN",
            Name: "Name",
            YearGroup: "YearGroup",
            PositivePointsTotal: "PositivePointsTotal",
            Detentions: "Detentions",
            InternalExclusions: "InternalExclusions",
            Suspensions: "Suspensions",
            Attendance: "Attendance",
            Lateness: "Lateness",
            OnCalls: "OnCalls",
            SEND: "SEND",
            PP: "PP",
            Status: "Status"
          }, null, 2)}
        />
        <p className="text-xs text-slate-600">Mapping JSON keys must be required field names; values are CSV column names.</p>
        <button className="rounded bg-slate-900 px-3 py-2 text-white" type="submit">Upload and process</button>
      </form>
    </div>
  );
}
