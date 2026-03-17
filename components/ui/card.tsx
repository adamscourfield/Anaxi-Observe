import { HTMLAttributes, ReactNode } from "react";

type CardTone = "default" | "subtle" | "inset" | "interactive";

const toneClasses: Record<CardTone, string> = {
  default: "border border-border bg-white shadow-md",
  subtle: "border border-border/60 bg-white shadow-sm",
  inset: "border border-border/60 bg-[#f4f7fb]",
  interactive:
    "border border-border bg-white shadow-md calm-transition hover:border-accent/30 hover:shadow-lg cursor-pointer",
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
