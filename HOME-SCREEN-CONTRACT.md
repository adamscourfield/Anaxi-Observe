# Home screen data contract (Phase 4 scaffolding)

Date: 2026-03-07

This contract defines the initial home-card set and ownership boundaries so the UI can evolve without reworking data plumbing.

Canonical source: `modules/home/contracts.ts`

## Principles

- Keep existing behaviour intact while refactoring.
- Use stable card IDs.
- Each card has one owned source of truth.
- Feature flags and role visibility both gate card rendering.

## Initial card set

### Instruction
1. `observe.cpd-priorities`
2. `observe.teacher-support-priorities`
3. `observe.whole-school-focus`
4. `observe.my-observation-profile`
5. `observe.positive-momentum`

### Culture
6. `culture.cohort-change`
7. `culture.student-support-priorities`
8. `culture.my-oncall-status`

### Operations
9. `operations.leave-approvals`
10. `operations.meetings-today`
11. `operations.my-open-actions`
12. `operations.my-leave-status`

## Ownership map

- Observe cards → `modules/analysis/*` and observation profile computations
- Culture cards → cohort/student analysis + on-call request list
- Operations cards → LOA + meetings + actions

## Rendering contract

A card should render only when:
1. user role is in card `roles`
2. all `requiredFeatures` are enabled for tenant
3. source query returns either data OR empty-state payload

## Empty/error states

- Empty state text must be explicit and action-oriented.
- Query errors should degrade gracefully (card-level fallback), not crash whole home page.

## Next implementation step

Introduce a simple home assembler in a later pass:
- evaluate contracts for current user + features
- execute card data sources in parallel
- return typed payload for UI sections

This keeps the page layout independent from data orchestration.
