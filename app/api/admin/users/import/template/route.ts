import { NextResponse } from "next/server";
import { generateStaffCSVTemplate } from "@/modules/staff-import/csv";

export async function GET() {
  const csv = generateStaffCSVTemplate();
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": 'attachment; filename="staff-import-template.csv"',
    },
  });
}
