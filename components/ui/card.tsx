import { HTMLAttributes, ReactNode } from "react";

type CardTone = "default" | "subtle" | "inset" | "interactive";

const toneClasses: Record<CardTone, string> = {
  default: "border border-border bg-white shadow-sm",
  subtle: "border border-border/60 bg-white",
  inset: "border border-border/60 bg-bg",
  interactive:
    "border border-border bg-white shadow-sm calm-transition hover:border-accent/25 hover:shadow-md",
};

export function Card({
  children,
  className = "",
  tone = "default",
  ...props
}: {
  children: ReactNode;
  className?: string;
  tone?: CardTone;
} & HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`rounded-xl p-5 ${toneClasses[tone]} ${className}`} {...props}>
      {children}
    </div>
  );
}

export function InteractiveCard({
  children,
  className = "",
  ...props
}: {
  children: ReactNode;
  className?: string;
} & HTMLAttributes<HTMLDivElement>) {
  return (
    <Card tone="interactive" className={className} {...props}>
      {children}
    </Card>
  );
}
