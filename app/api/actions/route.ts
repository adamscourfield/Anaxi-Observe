import { NextResponse } from "next/server";
import { getSessionUserOrThrow } from "@/lib/auth";
import { requireFeature } from "@/lib/guards";
import { hasPermission } from "@/lib/rbac";
import { getMyActions } from "@/modules/actions/service";

export async function GET(req: Request) {
  try {
    const user = await getSessionUserOrThrow();
    await requireFeature(user.tenantId, "MEETINGS");
    if (!hasPermission(user.role, "actions:view_own")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const grouped = await getMyActions(user.tenantId, user.id);
    return NextResponse.json(grouped);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (message === "UNAUTHENTICATED") return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    if (message === "FEATURE_DISABLED") return NextResponse.json({ error: "Feature disabled" }, { status: 403 });
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
