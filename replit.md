# Anaxi — Replit Environment

## Overview
Anaxi is a Next.js 14 school management platform with multi-tenant support. It handles student behaviour tracking, on-call requests, observations, meetings, leave approvals, staff imports, and analytics/insights.

## Tech Stack
- **Framework**: Next.js 14 (App Router)
- **Auth**: NextAuth v4
- **ORM**: Prisma with PostgreSQL (Replit built-in database)
- **Styling**: Tailwind CSS
- **Email**: SendGrid (optional)
- **Testing**: Vitest

## Running the App
The workflow `Start application` runs `npm run dev` which starts Next.js on port 5000 (required for Replit webview).

## Environment Variables / Secrets
| Key | Purpose | Where |
|-----|---------|--------|
| `DATABASE_URL` | PostgreSQL connection string | Replit secret (auto-managed) |
| `NEXTAUTH_SECRET` | NextAuth JWT signing secret | Replit secret |
| `NEXTAUTH_URL` | Public app URL | Replit env var (shared) |
| `CRON_SECRET` | API route auth for cron jobs | Replit secret |
| `SENDGRID_API_KEY` | Email sending (optional) | Replit secret |
| `FROM_EMAIL` | Sender address for emails | Replit env var |

## Database
- Uses Replit's built-in PostgreSQL
- Schema managed with Prisma migrations
- After migration issues on first run, schema was applied with `prisma db push --force-reset`
- To seed demo data: `npm run seed:demo`

## Key Directories
- `app/` — Next.js App Router pages and API routes
- `components/` — Shared React components
- `lib/` — Server utilities, auth config, Prisma client
- `modules/` — Feature modules
- `prisma/` — Schema, migrations, and seed scripts

## Analytics Consolidation
- The three analytics list pages (`/analysis/teachers`, `/analysis/cpd`, `/analysis/students`) have been consolidated into a single tabbed page at `/analytics`.
- Tab switching uses `?tab=teachers|cpd|students` query parameter.
- Permanent redirects from old URLs are configured in `next.config.mjs`.
- Detail pages remain at their original routes (`/analysis/teachers/[memberId]`, `/analysis/cpd/[signalKey]`, `/analysis/students/[id]`).
- The sidebar shows a single "Analytics" nav item instead of three separate items.
- The `actions.ts` file for student watchlist toggle remains at `app/(tenant)/analysis/students/actions.ts`.

## Design System (v2 — Premium Redesign)
- **Layout**: No top header on authenticated pages. Full-height sidebar owns brand + nav + logout. Content area uses `px-8 py-8` with `max-w-[1400px]`.
- **Sidebar**: Fixed full-height (`h-screen`), white bg, border-right. Brand mark at top, nav sections in middle, logout anchored at bottom. Collapsible with expand button.
- **Accent colour**: Indigo (`#4f46e5`) — used for active nav items (solid fill), buttons, links, and focus rings.
- **Typography**: H1 = 30px/bold, H2 = 20px/semibold, H3 = 16px/semibold. Inter font.
- **Tokens**: All design tokens in `app/globals.css` (:root). Tailwind maps them in `tailwind.config.ts`.
- **Cards**: `rounded-xl p-5`, subtle shadow, no translate-y hover effects.
- **Buttons**: Active press uses `scale-[0.98]`, not translate. Focus ring uses `ring-offset-2`.
- **Login page**: Full-viewport split layout — left panel has indigo gradient with brand messaging, right panel has the form.
- **Nav active state**: Solid `bg-accent text-white` pill with shadow — not a tinted background.
- **Core UI components**: `components/ui/` — Card, Button, PageHeader, StatusPill, SectionHeader, CollapsibleCard, EmptyState, TileOption, DriverChips, StatCard, Avatar.
- **Sidebar CSS var**: `--sidebar-width: 260px`, `--sidebar-collapsed-width: 72px`.

## Home Page
- Home page at `/home` has three role-based variants: Leadership (SLT/ADMIN), HOD, and Teacher.
- **StatCard** (`components/ui/stat-card.tsx`): White card with coloured top accent bar, used for hero stat rows on each variant.
- **Avatar** (`components/ui/avatar.tsx`): Circular initials badge with deterministic colour, used on teacher name rows.
- Leadership hero: 4 stat cards (observations, urgent students, CPD drift signals, teachers drifting).
- HOD hero: 2 stat cards (dept observations, dept CPD signals).
- Teacher hero: 2 stat cards (your observations, open actions).
- Priority lists (CPD, teachers, students) are polished with avatars, status pills, and driver chips.
- Cohort change shown inline (not collapsible), Leave Approvals and Positive Momentum collapsed sections removed.

## Replit Migration Notes
- Dev/start scripts updated to use `-p 5000 -H 0.0.0.0`
- `NEXTAUTH_URL` set to the Replit dev domain
