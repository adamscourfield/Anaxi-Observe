import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const admin = await requireAdminUser();

    const departments = await (prisma as any).department.findMany({
      where: { tenantId: admin.tenantId },
      orderBy: { name: "asc" },
      include: {
        memberships: {
          include: { user: { select: { id: true, fullName: true, email: true } } },
        },
      },
    });

    const rows: string[] = [
      "Department Name,Faculty,HOD Name,HOD Email,Member Count,Members",
    ];

    for (const dept of departments as any[]) {
      const hod = (dept.memberships as any[]).find((m: any) => m.isHeadOfDepartment);
      const members = (dept.memberships as any[])
        .map((m: any) => m.user.fullName)
        .join("; ");

      rows.push([
        `"${dept.name}"`,
        `"${dept.faculty ?? ""}"`,
        `"${hod?.user?.fullName ?? ""}"`,
        `"${hod?.user?.email ?? ""}"`,
        String(dept.memberships.length),
        `"${members}"`,
      ].join(","));
    }

    const csv = rows.join("\n");
    const filename = `departments_${new Date().toISOString().slice(0, 10)}.csv`;

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (message === "UNAUTHENTICATED" || message === "FORBIDDEN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
