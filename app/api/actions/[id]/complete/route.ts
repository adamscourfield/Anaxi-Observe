import { NextResponse } from "next/server";
import { getSessionUserOrThrow } from "@/lib/auth";
import { requireFeature } from "@/lib/guards";
import { hasPermission } from "@/lib/rbac";
import { completeAction } from "@/modules/actions/service";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUserOrThrow();
    await requireFeature(user.tenantId, "MEETINGS");
    if (!hasPermission(user.role, "actions:manage")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const action = await completeAction(user.tenantId, params.id, user.id);
    return NextResponse.json(action);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (message === "UNAUTHENTICATED") return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    if (message === "FEATURE_DISABLED") return NextResponse.json({ error: "Feature disabled" }, { status: 403 });
    if (message === "action not found") return NextResponse.json({ error: message }, { status: 404 });
    if (message === "only owner can complete action") return NextResponse.json({ error: message }, { status: 403 });
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
