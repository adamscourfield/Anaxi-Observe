# Schema conventions (refactor baseline)

Use these conventions for new schema work during modularisation.

## Tenant safety

1. Every tenant-owned table must include `tenantId`.
2. Add indexes that start with `tenantId` for common query paths.
3. Prefer tenant-scoped composite relations (`[tenantId, foreignId]`) when possible.

## Foreign key naming

- Use `...UserId` for user references.
- Use explicit names for role-specific links (e.g. `createdByUserId`, `ownerUserId`, `observerId`).
- Avoid introducing mixed aliases (`uploadedBy` vs `uploadedByUserId`) in new models.

## Domain boundaries

- Keep shared identity entities in core (`Tenant`, `User`, `Student`, `Department`).
- Keep workflow entities in domain tables:
  - Observe: observations/signals
  - Culture: behaviour snapshots/on-call
  - Operations: leave/meetings

## Non-breaking rule (current phase)

Do not change semantics of existing workflows while applying these conventions.
