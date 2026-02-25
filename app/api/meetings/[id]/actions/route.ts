import { NextResponse } from "next/server";
import { getSessionUserOrThrow } from "@/lib/auth";
import { requireFeature } from "@/lib/guards";
import { hasPermission } from "@/lib/rbac";
import { createAction } from "@/modules/actions/service";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUserOrThrow();
    await requireFeature(user.tenantId, "MEETINGS");
    if (!hasPermission(user.role, "actions:create")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { description, ownerUserId, dueDate } = body;

    if (!description || !ownerUserId) {
      return NextResponse.json({ error: "description and ownerUserId are required" }, { status: 400 });
    }

    const action = await createAction(user.tenantId, params.id, user.id, {
      description,
      ownerUserId,
      dueDate: dueDate ? new Date(dueDate) : undefined,
    });

    return NextResponse.json(action, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (message === "UNAUTHENTICATED") return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    if (message === "FEATURE_DISABLED") return NextResponse.json({ error: "Feature disabled" }, { status: 403 });
    if (message === "meeting not found") return NextResponse.json({ error: message }, { status: 404 });
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
