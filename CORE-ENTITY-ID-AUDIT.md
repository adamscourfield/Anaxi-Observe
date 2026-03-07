# Core entity + ID audit (Phase 2)

Date: 2026-03-07
Scope: Existing Anaxi-Observe schema and active workflows (Observe, Behaviour/On-call, Leave, Meetings, Analysis/Admin).

## Objective

Confirm shared entity consistency before deeper refactor work.

Target shared IDs:
- `tenantId`
- `userId` / staff user refs
- `studentId`
- `departmentId`
- `meetingId`
- `observationId`

## Summary

- ✅ Multi-tenant boundary is present across domain tables via `tenantId`.
- ✅ Most cross-entity joins in workflow-critical paths use tenant-scoped composite relations.
- ⚠️ A subset of relations use global `id` joins where tenant-scoped composite joins would be safer.
- ✅ Current state is stable enough to continue modularisation without changing live behaviour.

## Domain-by-domain check

### 1) Instruction (Observe)
Tables: `Observation`, `ObservationSignal`, `TenantSignalLabel`, `TenantSettings`.

- `Observation` has `tenantId`, `observedTeacherId`, `observerId`.
- Indexed by `[tenantId, observedAt]`, `[tenantId, observedTeacherId, observedAt]`.
- `ObservationSignal` linked by `observationId` with unique per signal key.

Status: ✅ Good for current phase.

### 2) Culture (Behaviour + On-call)
Tables: `Student`, `StudentSnapshot`, `StudentChangeFlag`, `OnCallRequest`, taxonomy tables.

- `Student` is tenant-scoped (`@@unique([tenantId, id])`).
- `OnCallRequest` relations to requester/student are tenant-scoped composite refs.
- On-call indexes support inbox and open queue patterns.

Status: ✅ Good for current phase.

### 3) Operations (Leave + Meetings)
Tables: `LOARequest`, `LeaveApprovalGroup*`, `Meeting*`.

- Leave models are tenant-scoped.
- Meetings use composite refs for creator/attendees/actions in key places.
- Indexes present for due dates, owner queues, and meeting timelines.

Status: ✅ Good for current phase.

### 4) Admin + Analytics
Tables: `TenantFeature`, `TenantVocab`, `AnalysisRun`, `Insight`, `ImportJob*`, departments.

- Strong tenant coverage across config and analysis entities.
- Import + insight models are mostly tenant-bound.

Status: ✅ Good for current phase.

## Consistency findings (watchlist)

These are **not blockers** for the current refactor, but should be standardised in a later hardening pass:

1. Some user relations reference global `User.id` instead of `[tenantId, id]`.
   - Example areas: `Observation.observedTeacher`, `Observation.observer`, `ImportJob.createdBy`, `TenantImportMapping.createdBy`, `Insight.teacher`, several admin/support relations.
   - Risk: lower tenant-boundary explicitness at relation level (even if IDs are globally unique).

2. `Subject` currently carries `tenantId` but no explicit relation field to `Tenant`.
   - Works functionally, but weakens schema-level consistency compared with other tenant-owned entities.

3. Naming consistency can be tightened over time:
   - `requesterId`, `createdByUserId`, `uploadedBy`, etc. are semantically correct but mixed naming patterns.

## Recommended next actions

### Phase 2A (safe, no behaviour change)
- Keep current schema as-is.
- Add a lightweight conventions note for new models:
  - Always include `tenantId`.
  - Prefer composite refs (`[tenantId, foreignId]`) when parent model supports it.
  - Prefer `...UserId` suffix for user foreign keys.

### Phase 2B (hardening migration, optional)
- Convert remaining global `id` user relations to tenant-scoped composite refs.
- Add `Subject -> Tenant` relation field for consistency.
- Align FK naming where churn is low.

## Regression guardrail

No change in this phase should alter:
- observation signals
- observation drift parameters
- leave/meetings/on-call/behaviour workflows

See also: `DO-NOT-CHANGE.md`.
