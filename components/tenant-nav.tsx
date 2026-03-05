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

type NavGroup = {
  label: string;
  items: NavItem[];
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

  const groups = useMemo<NavGroup[]>(() => {
    const overview: NavGroup = {
      label: "Overview",
      items: [
        { label: "Home", href: "/home", icon: "⌂" },
        { label: "My actions", href: "/my-actions", icon: "✓" },
      ],
    };

    const teaching: NavGroup = {
      label: "Teaching",
      items: [
        ...(has("OBSERVATIONS") ? [{ label: "Observe", href: "/observe", icon: "◉" }] : []),
        ...(has("OBSERVATIONS") ? [{ label: "Signals", href: "/observe/history", icon: "◌" }] : []),
        ...(has("ANALYSIS") ? [{ label: "Explorer", href: "/explorer", icon: "◎" }] : []),
        ...(has("ANALYSIS") ? [{ label: "Teacher analysis", href: "/analysis/teachers", icon: "◍" }] : []),
        ...(has("ANALYSIS") ? [{ label: "Student priorities", href: "/analysis/students", icon: "◈" }] : []),
      ],
    };

    const operations: NavGroup = {
      label: "Operations",
      items: [
        ...(has("STUDENTS") ? [{ label: "Students", href: "/students", icon: "◫" }] : []),
        ...(has("STUDENTS_IMPORT") && canImport ? [{ label: "Import", href: "/behaviour/import", icon: "⇪" }] : []),
        ...(has("ON_CALL") ? [{ label: "On call", href: "/on-call", icon: "!", badgeCount: onCallCount }] : []),
        ...(has("MEETINGS") ? [{ label: "Meetings", href: "/meetings", icon: "✦" }] : []),
        ...(has("LEAVE") ? [{ label: "Leave", href: "/leave", icon: "◔", badgeCount: leaveCount }] : []),
      ],
    };

    const admin: NavGroup = {
      label: "Admin",
      items: role === "ADMIN" && has("ADMIN") ? [{ label: "Dashboard", href: "/admin", icon: "⚙" }] : [],
    };

    return [overview, teaching, operations, admin].filter((g) => g.items.length > 0);
  }, [enabledFeatures, leaveCount, onCallCount, role]);

  return (
    <aside
      className={`sticky top-4 h-[calc(100vh-2rem)] overflow-hidden rounded-[24px] border border-border bg-surface shadow-sm calm-transition ${
        collapsed ? "w-[86px]" : "w-[290px]"
      }`}
      aria-label="Sidebar menu"
    >
      <div className="flex h-full flex-col p-3">
        <div className="mb-3 flex items-center gap-2 rounded-xl bg-[var(--surface-subtle)] p-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-lg">⌁</div>
          {!collapsed && <span className="text-sm font-semibold">Anaxi Observe</span>}
        </div>

        <nav className="flex-1 space-y-3 overflow-y-auto pr-1">
          {groups.map((group) => (
            <div key={group.label} className="space-y-1">
              {!collapsed && <p className="px-2 text-[11px] font-medium uppercase tracking-[0.08em] text-muted">{group.label}</p>}
              {group.items.map((item) => {
                const active = pathname === item.href || pathname?.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={item.label}
                    className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm calm-transition ${
                      active
                        ? "bg-primaryBtn text-white shadow-sm"
                        : "text-muted hover:bg-[var(--surface-subtle)] hover:text-text"
                    }`}
                  >
                    <span className="flex h-5 w-5 items-center justify-center text-base">{item.icon}</span>
                    {!collapsed && <span className="truncate">{item.label}</span>}
                    {!collapsed && item.badgeCount && item.badgeCount > 0 ? (
                      <span className={`ml-auto rounded-full px-1.5 py-0.5 text-[10px] ${active ? "bg-white/25 text-white" : "bg-amber-500 text-white"}`}>
                        {item.badgeCount}
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <button
          onClick={() => setCollapsed((prev) => !prev)}
          className="mt-3 flex items-center justify-center gap-2 rounded-lg border border-border bg-[var(--surface-subtle)] px-3 py-2 text-xs text-muted hover:bg-divider"
          type="button"
        >
          <span className={`inline-block calm-transition ${collapsed ? "rotate-180" : ""}`}>⌃</span>
          {!collapsed && "Collapse"}
        </button>
      </div>
    </aside>
  );
}
