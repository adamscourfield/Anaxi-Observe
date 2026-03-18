import { HTMLAttributes, ReactNode } from "react";

type CardTone = "default" | "subtle" | "inset" | "interactive";

const toneClasses: Record<CardTone, string> = {
  default: "border border-border/80 bg-white shadow-sm",
  subtle: "border border-border/50 bg-white shadow-sm",
  inset: "border border-border/50 bg-[#f9fafb]",
  interactive:
    "border border-border/80 bg-white shadow-sm calm-transition hover:border-accent/25 hover:shadow-md cursor-pointer",
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
    <div className={`rounded-2xl p-5 ${toneClasses[tone]} ${className}`} {...props}>
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
