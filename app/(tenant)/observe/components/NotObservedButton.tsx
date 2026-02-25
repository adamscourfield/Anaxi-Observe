"use client";

import { Button } from "@/components/ui/button";

export function NotObservedButton({ onClick }: { onClick: () => void }) {
  return <Button type="button" variant="secondary" onClick={onClick} className="w-full border-dashed">Not observed</Button>;
}
