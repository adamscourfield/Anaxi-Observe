"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { FeatureKey, UserRole } from "@/lib/types";

type NavItem = {
  label: string;
  href: string;
  icon: string;
  badgeCount?: number;
};

export function TenantNav({
  role,
  enabledFeatures,
  onCallCount = 0,
  leaveCount = 0,
}: {
  role: UserRole;
  enabledFeatures: FeatureKey[];
  onCallCount?: number;
  leaveCount?: number;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(true);

  const has = (feature: FeatureKey) => enabledFeatures.includes(feature);
  const canImport = role === "SLT" || role === "ADMIN";

  const items = useMemo<NavItem[]>(
    () => [
      { label: "Home", href: "/home", icon: "⌂" },
      ...(has("OBSERVATIONS") ? [{ label: "Observe", href: "/observe", icon: "◉" }] : []),
      ...(has("OBSERVATIONS") ? [{ label: "Signals", href: "/observe/history", icon: "◌" }] : []),
      ...(has("ANALYSIS") ? [{ label: "Explorer", href: "/explorer", icon: "◎" }] : []),
      ...(has("ANALYSIS") ? [{ label: "Teacher analysis", href: "/analysis/teachers", icon: "◍" }] : []),
      ...(has("ANALYSIS") ? [{ label: "Student priorities", href: "/analysis/students", icon: "◈" }] : []),
      ...(has("STUDENTS") ? [{ label: "Students", href: "/students", icon: "◫" }] : []),
      ...(has("STUDENTS_IMPORT") && canImport ? [{ label: "Import", href: "/behaviour/import", icon: "⇪" }] : []),
      ...(has("ON_CALL") ? [{ label: "On call", href: "/on-call", icon: "!", badgeCount: onCallCount }] : []),
      ...(has("MEETINGS") ? [{ label: "Meetings", href: "/meetings", icon: "✦" }] : []),
      ...(has("LEAVE") ? [{ label: "Leave", href: "/leave", icon: "◔", badgeCount: leaveCount }] : []),
      { label: "My actions", href: "/my-actions", icon: "✓" },
      ...(role === "ADMIN" && has("ADMIN") ? [{ label: "Admin", href: "/admin", icon: "⚙" }] : []),
    ],
    [enabledFeatures, onCallCount, leaveCount, role]
  );

  return (
    <aside
      className={`sticky top-4 h-[calc(100vh-2rem)] rounded-[24px] border border-border bg-surface p-3 shadow-sm calm-transition ${
        collapsed ? "w-[86px]" : "w-[250px]"
      }`}
      aria-label="Sidebar menu"
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--surface-subtle)] text-lg">⌁</div>
        {!collapsed && <span className="text-sm font-semibold text-text">Anaxi</span>}
      </div>

      <nav className="space-y-2">
        {items.map((item) => {
          const active = pathname === item.href || pathname?.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              className={`group relative flex items-center gap-3 rounded-xl px-3 py-3 text-sm calm-transition ${
                active
                  ? "bg-primaryBtn text-white shadow-sm"
                  : "bg-[var(--surface-subtle)] text-muted hover:bg-divider hover:text-text"
              }`}
            >
              <span className="flex h-5 w-5 items-center justify-center text-base">{item.icon}</span>
              {!collapsed && <span className="truncate">{item.label}</span>}
              {item.badgeCount && item.badgeCount > 0 ? (
                <span className={`ml-auto rounded-full px-1.5 py-0.5 text-[10px] ${active ? "bg-white/25 text-white" : "bg-amber-500 text-white"}`}>
                  {item.badgeCount}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      <button
        onClick={() => setCollapsed((prev) => !prev)}
        className="absolute bottom-3 left-3 right-3 rounded-lg border border-border bg-[var(--surface-subtle)] px-3 py-2 text-xs text-muted hover:bg-divider"
        type="button"
      >
        {collapsed ? "Expand" : "Collapse"}
      </button>
    </aside>
  );
}
