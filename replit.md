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

## Replit Migration Notes
- Dev/start scripts updated to use `-p 5000 -H 0.0.0.0`
- `NEXTAUTH_URL` set to the Replit dev domain
