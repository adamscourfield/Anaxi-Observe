# Anaxi Stage 1

Core platform + Students + On Call + Leave module foundations.

## Implemented
- NextAuth credentials auth + tenant session context
- Feature flags + RBAC helpers
- Admin routes for users/features/vocab/taxonomies/import jobs
- Students module: list/profile/imports/flags
- On Call module:
  - `/tenant/on-call/new` fast request form
  - `/tenant/on-call/feed` daily feed with filters
  - `/tenant/on-call/[id]` detail with SLT acknowledge/resolve actions
  - `POST /api/on-call/send` creates request first, sends recipient email, keeps request if email fails
- Leave of Absence module:
  - `/tenant/leave/request` submit leave request
  - `/tenant/leave/calendar` month view showing pending vs approved
  - `/tenant/leave/pending` authoriser queue
  - `/tenant/leave/[id]` request detail + approve paid/unpaid or deny
- Meetings module:
  - `/tenant/meetings` upcoming/past list with mine/all scope
  - `/tenant/meetings/new` meeting create form
  - `/tenant/meetings/[id]` detail with notes + attendees + actions
  - `/tenant/meetings/actions` my actions view with overdue/due soon highlighting
- Observations module:
  - `/tenant/observe/new` create structured 12-signal observation (leader/slt/admin)
  - `/tenant/observe/history` filterable history with teacher-scope enforcement
  - `/tenant/observe/[id]` read-only detail

## Students routes
- `/tenant/students`
- `/tenant/students/import`
- `/tenant/students/import-subject-teachers`
- `/tenant/students/[id]`

## On Call routes
- `/tenant/on-call/new`
- `/tenant/on-call/feed`
- `/tenant/on-call/[id]`

## Leave routes
- `/tenant/leave`
- `/tenant/leave/request`
- `/tenant/leave/calendar`
- `/tenant/leave/pending`
- `/tenant/leave/[id]`

## Meetings routes
- `/tenant/meetings`
- `/tenant/meetings/new`
- `/tenant/meetings/[id]`
- `/tenant/meetings/actions`

## Observation routes
- `/tenant/observe`
- `/tenant/observe/new`
- `/tenant/observe/history`
- `/tenant/observe/[id]`

## API routes
- `POST /api/students/import`
- `POST /api/students/import-subject-teachers`
- `POST /api/cron/compute-student-flags` (header: `x-cron-secret`)
- `POST /api/on-call/send`

## Setup
```bash
npm install
cp .env.example .env
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run dev
```

## Env
- `DATABASE_URL`
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- `CRON_SECRET`
- `SENDGRID_API_KEY` (optional)
- `FROM_EMAIL` (optional)

### Replit note
If you run on Replit, set `NEXTAUTH_URL` to your Replit app URL (e.g. `https://<your-subdomain>.replit.dev`) and restart the app after updating env vars.

## Demo login
- `admin@demo.school`
- `Password123!`
## Admin permissions/settings
- `/tenant/admin/settings` controls tenant module enable/disable (school-level module assignment)
- `/tenant/admin/users` now supports:
  - LOA global approver permission (`canApproveAllLoa`)
  - LOA scoped approval permissions (approve LOAs for specific staff)
  - On Call email permission (`receivesOnCallEmails`)
- LOA approvals block self-approval and enforce approver scope rules.
