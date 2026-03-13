import { ReactNode } from "react";

export function H1({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <h1 className={`text-[30px] font-bold leading-tight tracking-[-0.025em] text-text ${className}`}>{children}</h1>;
}

export function H2({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <h2 className={`text-[20px] font-semibold leading-snug tracking-[-0.015em] text-text ${className}`}>{children}</h2>;
}

export function H3({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <h3 className={`text-[16px] font-semibold leading-snug tracking-[-0.01em] text-text ${className}`}>{children}</h3>;
}

export function BodyText({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <p className={`text-[14px] leading-relaxed text-text ${className}`}>{children}</p>;
}

export function MetaText({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <p className={`text-[12px] leading-snug text-muted ${className}`}>{children}</p>;
}
