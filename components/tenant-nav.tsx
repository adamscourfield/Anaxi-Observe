"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { FeatureKey, UserRole } from "@/lib/types";

type NavItem = {
  label: string;
  href: string;
  badgeCount?: number;
};

type NavSection = {
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
  const [collapsed, setCollapsed] = useState(false);

  const has = (feature: FeatureKey) => enabledFeatures.includes(feature);
  const canImport = role === "SLT" || role === "ADMIN";

  const sections: NavSection[] = [
    {
      label: "Overview",
      items: [{ label: "Home", href: "/home" }, { label: "My actions", href: "/my-actions" }],
    },
    {
      label: "Observations",
      items: [
        ...(has("OBSERVATIONS") ? [{ label: "Observation feed", href: "/tenant/observe" }] : []),
        ...(has("OBSERVATIONS") ? [{ label: "Signals history", href: "/tenant/observe/history" }] : []),
        ...(has("ANALYSIS") ? [{ label: "Explorer", href: "/explorer" }] : []),
      ],
    },
    {
      label: "Students & conduct",
      items: [
        ...(has("STUDENTS") ? [{ label: "Students", href: "/tenant/students" }] : []),
        ...(has("STUDENTS_IMPORT") && canImport ? [{ label: "Behaviour import", href: "/tenant/behaviour/import" }] : []),
      ],
    },
    {
      label: "Pastoral workflows",
      items: [
        ...(has("ON_CALL") ? [{ label: "On call", href: "/tenant/on-call", badgeCount: onCallCount }] : []),
        ...(has("MEETINGS") ? [{ label: "Meetings", href: "/tenant/meetings" }] : []),
        ...(has("LEAVE") ? [{ label: "Leave of absence", href: "/tenant/leave", badgeCount: leaveCount }] : []),
      ],
    },
    {
      label: "Analytics",
      items: [
        ...(has("ANALYSIS") ? [{ label: "Teacher analysis", href: "/analysis/teachers" }] : []),
        ...(has("ANALYSIS") ? [{ label: "CPD priorities", href: "/analysis/cpd" }] : []),
        ...(has("ANALYSIS") ? [{ label: "Student priorities", href: "/analysis/students" }] : []),
      ],
    },
    {
      label: "Administration",
      items: [
        ...(role === "ADMIN" && has("ADMIN") ? [{ label: "Admin dashboard", href: "/tenant/admin" }] : []),
        ...(role === "ADMIN" && has("ADMIN") ? [{ label: "User management", href: "/tenant/admin/users" }] : []),
        ...(role === "ADMIN" && has("ADMIN") ? [{ label: "Departments", href: "/tenant/admin/departments" }] : []),
        ...(role === "ADMIN" && has("ADMIN") ? [{ label: "Feature flags", href: "/tenant/admin/features" }] : []),
      ],
    },
  ].filter((section) => section.items.length > 0);

  return (
    <aside
      className={`sticky top-4 h-fit rounded-xl border border-border bg-surface p-3 shadow-sm calm-transition ${
        collapsed ? "w-[76px]" : "w-full md:w-[280px]"
      }`}
      aria-label="Sidebar menu"
    >
      <button
        onClick={() => setCollapsed((previous) => !previous)}
        className="mb-2 w-full rounded-md border border-border px-3 py-2 text-left text-sm text-muted hover:bg-divider"
        type="button"
        aria-expanded={!collapsed}
      >
        {collapsed ? "☰" : "Collapse menu"}
      </button>

      <nav className="space-y-2 text-sm">
        {sections.map((section) => {
          const sectionHasCurrent = section.items.some((item) => pathname?.startsWith(item.href));

          return (
            <details key={section.label} open={sectionHasCurrent || !collapsed} className="rounded-lg border border-border/70 bg-bg/30">
              <summary className="cursor-pointer list-none px-3 py-2 font-medium text-text">
                {collapsed ? section.label.slice(0, 1) : section.label}
              </summary>
              {!collapsed && (
                <ul className="space-y-1 border-t border-border/70 px-2 py-2">
                  {section.items.map((item) => {
                    const active = pathname?.startsWith(item.href);

                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          className={`flex items-center justify-between rounded-md px-2 py-1.5 text-sm calm-transition ${
                            active ? "bg-accent/15 text-text" : "text-muted hover:bg-divider hover:text-text"
                          }`}
                        >
                          <span>{item.label}</span>
                          {item.badgeCount && item.badgeCount > 0 ? (
                            <span className="rounded-full bg-amber-500 px-1.5 py-0.5 text-xs text-white">{item.badgeCount}</span>
                          ) : null}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </details>
          );
        })}
      </nav>
    </aside>
  );
}
