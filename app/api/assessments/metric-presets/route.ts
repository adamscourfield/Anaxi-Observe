import { NextResponse } from "next/server";
import { getSessionUserOrThrow } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { MetricRule } from "@/modules/assessments/metrics";

export async function GET() {
  const user = await getSessionUserOrThrow();

  const presets = await prisma.attainmentMetricPreset.findMany({
    where: { tenantId: user.tenantId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ presets });
}

export async function POST(req: Request) {
  const user = await getSessionUserOrThrow();
  const body = await req.json();

  const { name, description, rules, logic } = body;
  if (!name || !rules || !Array.isArray(rules) || rules.length === 0) {
    return NextResponse.json(
      { error: "name and at least one rule are required" },
      { status: 400 }
    );
  }

  // Validate rule structure
  for (const rule of rules as MetricRule[]) {
    if (!rule.subject || !rule.threshold || !rule.gradeFormat || !rule.operator) {
      return NextResponse.json(
        { error: "Each rule must have subject, threshold, gradeFormat, and operator" },
        { status: 400 }
      );
    }
  }

  const preset = await prisma.attainmentMetricPreset.create({
    data: {
      tenantId: user.tenantId,
      name,
      description: description ?? null,
      rulesJson: rules,
      logic: logic || "AND",
      createdByUserId: user.id,
    },
  });

  return NextResponse.json({ preset }, { status: 201 });
}
