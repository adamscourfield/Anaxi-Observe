import { createHash } from "crypto";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { H1, MetaText } from "@/components/ui/typography";

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export default async function InviteAcceptPage({ params }: { params: { token: string } }) {
  const invite = await (prisma as any).schoolAdminInvite.findUnique({
    where: { tokenHash: hashToken(params.token) },
    include: { tenant: true },
  });

  if (!invite) notFound();

  const expired = invite.acceptedAt || new Date(invite.expiresAt).getTime() < Date.now();

  return (
    <Card className="mx-auto max-w-lg space-y-4">
      <H1>School admin invite</H1>
      <MetaText>{invite.fullName} · {invite.email} · {invite.tenant.name}</MetaText>

      {expired ? (
        <p className="text-sm text-error">This invite is expired or already used.</p>
      ) : (
        <form method="post" action="/api/invite/accept" className="space-y-3">
          <input type="hidden" name="token" value={params.token} />
          <label className="block text-sm font-medium">Set password
            <input type="password" name="password" required className="field mt-1.5 w-full" />
          </label>
          <Button type="submit">Accept invite</Button>
        </form>
      )}
    </Card>
  );
}
