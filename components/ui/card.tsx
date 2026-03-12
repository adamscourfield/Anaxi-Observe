import { HTMLAttributes, ReactNode } from "react";

type CardTone = "default" | "subtle" | "inset" | "interactive";

const toneClasses: Record<CardTone, string> = {
  default: "border border-border/70 bg-surface/95 shadow-sm backdrop-blur-sm",
  subtle: "border border-border/60 bg-surface/72 shadow-sm backdrop-blur-sm",
  inset: "border border-border/60 bg-bg/35 shadow-inner",
  interactive:
    "border border-border/70 bg-surface/95 shadow-sm backdrop-blur-sm calm-transition hover:-translate-y-[1px] hover:border-accent/35 hover:bg-surface hover:shadow-md",
};

const toneStyles: Record<CardTone, React.CSSProperties> = {
  default: { boxShadow: "0 2px 10px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.03)" },
  subtle: { boxShadow: "0 2px 10px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.02)" },
  inset: {},
  interactive: { boxShadow: "0 2px 10px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.03)" },
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
    <div className={`rounded-2xl p-4 ${toneClasses[tone]} ${className}`} style={toneStyles[tone]} {...props}>
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
