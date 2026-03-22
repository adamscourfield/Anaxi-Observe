import { NextResponse } from "next/server";
import { getSessionUserOrThrow } from "@/lib/auth";
import { computeTriangulatedRisks } from "@/modules/assessments/analysis";

export async function GET(req: Request) {
  const user = await getSessionUserOrThrow();
  const { searchParams } = new URL(req.url);

  const windowDays = Math.min(
    Math.max(Number(searchParams.get("windowDays") || "21"), 7),
    90
  );
  const threshold = Math.min(
    Math.max(Number(searchParams.get("threshold") || "0.5"), 0),
    1
  );

  const result = await computeTriangulatedRisks(
    user.tenantId,
    user.id,
    windowDays,
    threshold
  );

  return NextResponse.json(result);
}
