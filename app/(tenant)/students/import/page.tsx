import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { H1, MetaText } from "@/components/ui/typography";

export default function StudentsImportPage() {
  return (
    <div className="space-y-4">
      <H1>Import student snapshots</H1>
      <Card>
        <form action="/api/students/import" method="post" encType="multipart/form-data" className="space-y-3">
          <input type="file" name="file" accept=".csv" required className="block text-sm text-text file:mr-3 file:rounded-lg file:border file:border-border file:bg-surface file:px-3 file:py-1.5 file:text-sm" />
          <input type="date" name="snapshotDate" className="field" required />
          <textarea
            name="mappingJson"
            className="field h-32 w-full font-mono text-xs"
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
          <MetaText>Mapping JSON keys must be required field names; values are CSV column names.</MetaText>
          <Button type="submit">Upload and process</Button>
        </form>
      </Card>
    </div>
  );
}
