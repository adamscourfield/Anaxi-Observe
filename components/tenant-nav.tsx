"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { FeatureKey, UserRole } from "@/lib/types";
import { hasAnyPermission, hasPermission } from "@/lib/rbac";

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

function NavIcon({ name, active }: { name: string; active: boolean }) {
  const stroke = active ? "currentColor" : "#9ca3af";
  const common = { viewBox: "0 0 20 20", fill: "none", className: "h-[18px] w-[18px] shrink-0", xmlns: "http://www.w3.org/2000/svg" };

  switch (name) {
    case "home":
      return <svg {...common}><path d="M3.5 8.5 10 3.5l6.5 5v7a1 1 0 0 1-1 1h-3.5v-4.5h-4V16.5H4.5a1 1 0 0 1-1-1v-7Z" stroke={stroke} strokeWidth="1.5" strokeLinejoin="round" /></svg>;
    case "check-square":
      return <svg {...common}><rect x="3.5" y="3.5" width="13" height="13" rx="2.5" stroke={stroke} strokeWidth="1.5" /><path d="m6.8 10 2.1 2.1 4.4-4.6" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>;
    case "radar":
      return <svg {...common}><circle cx="10" cy="10" r="6.5" stroke={stroke} strokeWidth="1.5" /><circle cx="10" cy="10" r="2.5" stroke={stroke} strokeWidth="1.5" /><path d="M10 3.5v6.5l4.5 4.5" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>;
    case "history":
      return <svg {...common}><path d="M4.5 10A5.5 5.5 0 1 0 6 6.2" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" /><path d="M4.5 4.5v3h3" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /><path d="M10 7.2v3l2.2 1.3" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>;
    case "grid":
      return <svg {...common}><rect x="3.5" y="3.5" width="5.5" height="5.5" rx="1.2" stroke={stroke} strokeWidth="1.5" /><rect x="11" y="3.5" width="5.5" height="5.5" rx="1.2" stroke={stroke} strokeWidth="1.5" /><rect x="3.5" y="11" width="5.5" height="5.5" rx="1.2" stroke={stroke} strokeWidth="1.5" /><rect x="11" y="11" width="5.5" height="5.5" rx="1.2" stroke={stroke} strokeWidth="1.5" /></svg>;
    case "users":
      return <svg {...common}><path d="M6.7 9.1a2.6 2.6 0 1 1 0-5.2 2.6 2.6 0 0 1 0 5.2ZM13.6 9.9a2.2 2.2 0 1 0 0-4.4" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" /><path d="M2.8 15.8a4.4 4.4 0 0 1 7.8-2.6M12.2 15.8a3.5 3.5 0 0 1 5-2" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>;
    case "upload":
      return <svg {...common}><path d="M10 12.8V4.5" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" /><path d="m6.8 7.7 3.2-3.2 3.2 3.2" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /><path d="M4 14.5v1a1.5 1.5 0 0 0 1.5 1.5h9a1.5 1.5 0 0 0 1.5-1.5v-1" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" /></svg>;
    case "flag":
      return <svg {...common}><path d="M5 17V4.2a.7.7 0 0 1 .9-.7l7.6 2.2a.9.9 0 0 0 .8-.1l.7-.4v7.4l-.7.4a.9.9 0 0 1-.8.1L5.9 11a.7.7 0 0 0-.9.7" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>;
    case "calendar":
      return <svg {...common}><rect x="3.5" y="4.5" width="13" height="12" rx="2" stroke={stroke} strokeWidth="1.5" /><path d="M6.5 2.8v3.4M13.5 2.8v3.4M3.5 8.2h13" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" /></svg>;
    case "moon":
      return <svg {...common}><path d="M13.8 13.9A5.8 5.8 0 0 1 8.4 4.4a6.1 6.1 0 1 0 5.4 9.5Z" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>;
    case "triangle":
      return <svg {...common}><path d="M10 4.2 15.8 15H4.2L10 4.2Z" stroke={stroke} strokeWidth="1.5" strokeLinejoin="round" /></svg>;
    case "spark":
      return <svg {...common}><path d="M10 3.5 11.7 8.3 16.5 10l-4.8 1.7L10 16.5l-1.7-4.8L3.5 10l4.8-1.7L10 3.5Z" stroke={stroke} strokeWidth="1.5" strokeLinejoin="round" /></svg>;
    case "chart":
      return <svg {...common}><path d="M4 15.5h12" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" /><path d="M6 13V9.5M10 13V6.5M14 13v-3" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" /></svg>;
    case "shield":
      return <svg {...common}><path d="M10 3.5 15.5 5.5v4.8c0 3.2-2.3 5.3-5.5 6.2-3.2-.9-5.5-3-5.5-6.2V5.5L10 3.5Z" stroke={stroke} strokeWidth="1.5" strokeLinejoin="round" /></svg>;
    case "building":
      return <svg {...common}><path d="M4.5 16.5v-10l5.5-2 5.5 2v10" stroke={stroke} strokeWidth="1.5" strokeLinejoin="round" /><path d="M8 8h.01M12 8h.01M8 11h.01M12 11h.01M9 16.5v-2.8h2v2.8" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" /></svg>;
    case "toggle":
      return <svg {...common}><rect x="3.5" y="6.2" width="13" height="7.6" rx="3.8" stroke={stroke} strokeWidth="1.5" /><circle cx="12.8" cy="10" r="2.2" stroke={stroke} strokeWidth="1.5" /></svg>;
    case "logout":
      return <svg {...common}><path d="M7.5 16.5h-3a1.5 1.5 0 0 1-1.5-1.5V5a1.5 1.5 0 0 1 1.5-1.5h3" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /><path d="M13 13.5 16.5 10 13 6.5" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /><path d="M16.5 10H7" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" /></svg>;
    default:
      return <svg {...common}><circle cx="10" cy="10" r="5.5" stroke={stroke} strokeWidth="1.5" /></svg>;
  }
}

function ChevronIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg">
      {direction === "left" ? (
        <path d="M10 3.5 5.5 8l4.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <path d="M6 3.5 10.5 8 6 12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      )}
    </svg>
  );
}

function iconFor(href: string) {
  if (href === "/home") return "home";
  if (href === "/my-actions") return "check-square";
  if (href.includes("/observe/history")) return "history";
  if (href.includes("/observe")) return "radar";
  if (href.includes("/explorer")) return "grid";
  if (href.includes("/students")) return "users";
  if (href.includes("/behaviour/import")) return "upload";
  if (href.includes("/on-call")) return "flag";
  if (href.includes("/meetings")) return "calendar";
  if (href.includes("/leave")) return "moon";
  if (href.includes("/analysis/teachers")) return "triangle";
  if (href.includes("/analysis/cpd")) return "spark";
  if (href.includes("/analysis/students")) return "chart";
  if (href.includes("/admin/users")) return "shield";
  if (href.includes("/admin/departments")) return "building";
  if (href.includes("/admin/features")) return "toggle";
  if (href.includes("/admin")) return "shield";
  return "grid";
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
  const canImport = hasPermission(role, "import:write");
  const canAccessAdmin = hasPermission(role, "admin:access");
  const canAccessAdminUsers = hasPermission(role, "admin:users");
  const canAccessAdminSettings = hasPermission(role, "admin:settings");
  const canSeeAnalysis = hasAnyPermission(role, ["analysis:view", "analysis:export"]);

  const navItem = (label: string, href: string, badgeCount?: number): NavItem => ({
    label,
    href,
    badgeCount,
    icon: iconFor(href),
  });

  const sections: NavSection[] = [
    { label: "Overview", items: [navItem("Home", "/home"), navItem("My actions", "/my-actions")] },
    {
      label: "Instruction",
      items: [
        ...(has("OBSERVATIONS") ? [navItem("Observation feed", "/tenant/observe")] : []),
        ...(has("OBSERVATIONS") ? [navItem("Signals history", "/tenant/observe/history")] : []),
        ...(has("ANALYSIS") && canSeeAnalysis ? [navItem("Explorer", "/explorer")] : []),
      ],
    },
    {
      label: "Culture",
      items: [
        ...(has("STUDENTS") ? [navItem("Students", "/tenant/students")] : []),
        ...(has("STUDENTS_IMPORT") && canImport ? [navItem("Behaviour import", "/tenant/behaviour/import")] : []),
        ...(has("ON_CALL") ? [navItem("On call", "/tenant/on-call", onCallCount)] : []),
      ],
    },
    {
      label: "Operations",
      items: [
        ...(has("MEETINGS") ? [navItem("Meetings", "/tenant/meetings")] : []),
        ...(has("LEAVE") ? [navItem("Leave of absence", "/tenant/leave", leaveCount)] : []),
      ],
    },
    {
      label: "Analytics",
      items: [
        ...(has("ANALYSIS") && canSeeAnalysis ? [navItem("Teacher analysis", "/analysis/teachers")] : []),
        ...(has("ANALYSIS") && canSeeAnalysis ? [navItem("CPD priorities", "/analysis/cpd")] : []),
        ...(has("ANALYSIS") && canSeeAnalysis ? [navItem("Student priorities", "/analysis/students")] : []),
      ],
    },
    {
      label: "Administration",
      items: [
        ...(canAccessAdmin && has("ADMIN") ? [navItem("Admin dashboard", "/tenant/admin")] : []),
        ...(canAccessAdminUsers && has("ADMIN") ? [navItem("User management", "/tenant/admin/users")] : []),
        ...(canAccessAdminSettings && has("ADMIN") ? [navItem("Departments", "/tenant/admin/departments")] : []),
        ...(canAccessAdminSettings && has("ADMIN") ? [navItem("Feature flags", "/tenant/admin/features")] : []),
      ],
    },
  ].filter((section) => section.items.length > 0);

  const sidebarWidth = collapsed ? "w-[72px]" : "w-[260px]";

  return (
    <aside
      className={`sticky top-0 flex h-screen shrink-0 flex-col border-r border-border bg-white calm-transition ${sidebarWidth}`}
      aria-label="Sidebar menu"
    >
      <div className={`flex items-center ${collapsed ? "justify-center px-2" : "px-5"} h-16 shrink-0`}>
        <Link href="/home" className={`flex items-center ${collapsed ? "justify-center" : "gap-3"} group`}>
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center">
            <Image src="/anaxi-logo.png" alt="Anaxi" width={24} height={24} priority className="h-6 w-6 object-contain" />
          </span>
          {!collapsed && (
            <span className="flex flex-col leading-none">
              <span className="text-[15px] font-bold tracking-[-0.02em] text-text calm-transition group-hover:text-accent">Anaxi</span>
              <span className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.1em] text-muted">School Ops</span>
            </span>
          )}
        </Link>
      </div>

      <div className="mx-4 h-px bg-border/60" />

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <div className="space-y-5">
          {sections.map((section) => (
            <div key={section.label}>
              {!collapsed && (
                <div className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted/60">{section.label}</div>
              )}
              <ul className="space-y-0.5">
                {section.items.map((item) => {
                  const active = pathname?.startsWith(item.href);
                  const showBadge = (item.badgeCount ?? 0) > 0;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        title={collapsed ? item.label : undefined}
                        className={`group flex items-center ${collapsed ? "justify-center" : "justify-between"} rounded-lg px-2 py-[7px] calm-transition ${
                          active
                            ? "bg-accent text-white font-medium shadow-sm"
                            : "text-muted hover:bg-bg hover:text-text"
                        }`}
                      >
                        <span className={`flex items-center ${collapsed ? "justify-center" : "gap-2.5"} min-w-0`}>
                          <NavIcon name={item.icon} active={!!active} />
                          {!collapsed && <span className="truncate text-[13px]">{item.label}</span>}
                        </span>
                        {!collapsed && showBadge && (
                          <span className={`ml-2 flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-semibold ${
                            active
                              ? "bg-white/20 text-white"
                              : (item.badgeCount ?? 0) >= 5
                                ? "bg-amber-100 text-amber-700"
                                : "bg-gray-100 text-gray-600"
                          }`}>
                            {item.badgeCount}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </nav>

      <div className="mx-4 h-px bg-border/60" />

      <div className={`flex shrink-0 items-center ${collapsed ? "justify-center" : "justify-between"} px-3 py-3`}>
        <form action="/api/auth/signout" method="post" className={collapsed ? "" : "flex-1"}>
          <button
            type="submit"
            title={collapsed ? "Log out" : undefined}
            className={`group flex items-center ${collapsed ? "justify-center" : "gap-2.5"} rounded-lg px-2 py-[7px] text-muted calm-transition hover:bg-bg hover:text-text ${collapsed ? "" : "w-full"}`}
          >
            <NavIcon name="logout" active={false} />
            {!collapsed && <span className="text-[13px]">Log out</span>}
          </button>
        </form>
        {!collapsed && (
          <button
            onClick={() => setCollapsed(true)}
            className="ml-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted calm-transition hover:bg-bg hover:text-text"
            type="button"
            title="Collapse navigation"
          >
            <ChevronIcon direction="left" />
          </button>
        )}
        {collapsed && (
          <button
            onClick={() => setCollapsed(false)}
            className="absolute -right-3 top-20 inline-flex h-6 w-6 items-center justify-center rounded-full border border-border bg-white text-muted shadow-sm calm-transition hover:text-text"
            type="button"
            title="Expand navigation"
          >
            <ChevronIcon direction="right" />
          </button>
        )}
      </div>
    </aside>
  );
}
