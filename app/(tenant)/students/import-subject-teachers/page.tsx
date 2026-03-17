import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { H1, MetaText } from "@/components/ui/typography";

export default function SubjectTeacherImportPage() {
  return (
    <div className="space-y-4">
      <H1>Import student subject teachers</H1>
      <Card>
        <form action="/api/students/import-subject-teachers" method="post" encType="multipart/form-data" className="space-y-3">
          <input type="file" name="file" accept=".csv" required className="block text-sm text-text file:mr-3 file:rounded-lg file:border file:border-border file:bg-surface file:px-3 file:py-1.5 file:text-sm" />
          <Button type="submit">Upload and process</Button>
        </form>
      </Card>
      <MetaText>Required columns: UPN, Subject, TeacherEmail, EffectiveFrom, EffectiveTo(optional).</MetaText>
    </div>
  );
}
