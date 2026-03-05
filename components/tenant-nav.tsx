"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { FeatureKey, UserRole } from "@/lib/types";

type NavItem = {
  label: string;
  href: string;
  badgeCount?: number;
  icon: string;
};

type NavSection = {
  label: string;
  items: NavItem[];
};

function iconFor(href: string) {
  if (href === "/home") return "◻";
  if (href === "/my-actions") return "✓";
  if (href.includes("/observe/history")) return "◷";
  if (href.includes("/observe")) return "◎";
  if (href.includes("/explorer")) return "◌";
  if (href.includes("/students")) return "◍";
  if (href.includes("/behaviour/import")) return "⇢";
  if (href.includes("/on-call")) return "⚑";
  if (href.includes("/meetings")) return "◫";
  if (href.includes("/leave")) return "◐";
  if (href.includes("/analysis/teachers")) return "△";
  if (href.includes("/analysis/cpd")) return "◇";
  if (href.includes("/analysis/students")) return "▽";
  if (href.includes("/admin/users")) return "◔";
  if (href.includes("/admin/departments")) return "▦";
  if (href.includes("/admin/features")) return "◩";
  if (href.includes("/admin")) return "□";
  return "•";
}

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

  const navItem = (label: string, href: string, badgeCount?: number): NavItem => ({
    label,
    href,
    badgeCount,
    icon: iconFor(href),
  });

  const sections: NavSection[] = [
    {
      label: "Overview",
      items: [navItem("Home", "/home"), navItem("My actions", "/my-actions")],
    },
    {
      label: "Observations",
      items: [
        ...(has("OBSERVATIONS") ? [navItem("Observation feed", "/tenant/observe")] : []),
        ...(has("OBSERVATIONS") ? [navItem("Signals history", "/tenant/observe/history")] : []),
        ...(has("ANALYSIS") ? [navItem("Explorer", "/explorer")] : []),
      ],
    },
    {
      label: "Students & conduct",
      items: [
        ...(has("STUDENTS") ? [navItem("Students", "/tenant/students")] : []),
        ...(has("STUDENTS_IMPORT") && canImport ? [navItem("Behaviour import", "/tenant/behaviour/import")] : []),
      ],
    },
    {
      label: "Pastoral workflows",
      items: [
        ...(has("ON_CALL") ? [navItem("On call", "/tenant/on-call", onCallCount)] : []),
        ...(has("MEETINGS") ? [navItem("Meetings", "/tenant/meetings")] : []),
        ...(has("LEAVE") ? [navItem("Leave of absence", "/tenant/leave", leaveCount)] : []),
      ],
    },
    {
      label: "Analytics",
      items: [
        ...(has("ANALYSIS") ? [navItem("Teacher analysis", "/analysis/teachers")] : []),
        ...(has("ANALYSIS") ? [navItem("CPD priorities", "/analysis/cpd")] : []),
        ...(has("ANALYSIS") ? [navItem("Student priorities", "/analysis/students")] : []),
      ],
    },
    {
      label: "Administration",
      items: [
        ...(role === "ADMIN" && has("ADMIN") ? [navItem("Admin dashboard", "/tenant/admin")] : []),
        ...(role === "ADMIN" && has("ADMIN") ? [navItem("User management", "/tenant/admin/users")] : []),
        ...(role === "ADMIN" && has("ADMIN") ? [navItem("Departments", "/tenant/admin/departments")] : []),
        ...(role === "ADMIN" && has("ADMIN") ? [navItem("Feature flags", "/tenant/admin/features")] : []),
      ],
    },
  ].filter((section) => section.items.length > 0);

  return (
    <aside
      className={`sticky top-4 h-fit rounded-2xl border border-border bg-surface p-3 shadow-sm calm-transition ${
        collapsed ? "w-[220px]" : "w-full md:w-[292px]"
      }`}
      aria-label="Sidebar menu"
    >
      <button
        onClick={() => setCollapsed((previous) => !previous)}
        className="mb-3 w-full rounded-lg border border-border px-3 py-2 text-left text-xs text-muted hover:bg-divider"
        type="button"
        aria-expanded={!collapsed}
      >
        {collapsed ? "Expand menu" : "Collapse menu"}
      </button>

      <nav className="space-y-2 text-sm">
        {sections.map((section) => {
          const sectionHasCurrent = section.items.some((item) => pathname?.startsWith(item.href));

          return (
            <details key={section.label} open={sectionHasCurrent || !collapsed} className="rounded-xl border border-border/70 bg-bg/20">
              <summary className="cursor-pointer list-none px-3 py-2 text-xs font-medium text-muted">
                {section.label}
              </summary>
              <ul className="space-y-1.5 border-t border-border/60 px-2 py-2">
                {section.items.map((item) => {
                  const active = pathname?.startsWith(item.href);

                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={`group flex items-center justify-between rounded-lg px-2.5 py-2 text-sm calm-transition ${
                          active
                            ? "border border-border bg-divider/70 text-text"
                            : "border border-transparent text-muted hover:border-border/60 hover:bg-divider/60 hover:text-text"
                        }`}
                      >
                        <span className="flex items-center gap-2.5">
                          <span
                            className={`inline-flex h-6 w-6 items-center justify-center rounded-md border text-[11px] font-semibold ${
                              active ? "border-border bg-surface text-text" : "border-border/80 bg-bg text-muted group-hover:text-text"
                            }`}
                            aria-hidden
                          >
                            {item.icon}
                          </span>
                          <span className="font-medium tracking-[0.01em]">{item.label}</span>
                        </span>
                        {item.badgeCount && item.badgeCount > 0 ? (
                          <span className="rounded-full bg-amber-500 px-1.5 py-0.5 text-xs text-white">{item.badgeCount}</span>
                        ) : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </details>
          );
        })}
      </nav>
    </aside>
  );
}
