"use client";

import { Button } from "@/components/ui/button";

export function NotObservedButton({ onClick, active = false }: { onClick: () => void; active?: boolean }) {
  return (
    <Button
      type="button"
      variant="secondary"
      onClick={onClick}
      className={`w-full border-dashed ${active ? "border-accent bg-accent/10 text-accent" : ""}`}
    >
      Skip for now
    </Button>
  );
}
