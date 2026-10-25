# F9.70.1 — Historical Snapshot Compatibility

## Verdict

**PASS WITH LIMITATIONS.** F9.70 introduced a confirmed read regression for historically valid survey measurements whose `semanticType` was omitted. A narrow read-boundary adapter now supplies the database contract's established `custom` default. No revision is rewritten.

## Compatibility boundary and evidence

The affected path is `field_survey_revisions` → `getExecutionPlanLinkedSurveys` → the linked-survey disclosure on `/kivitelezes/[planId]`. The page loads this data in the same `Promise.all` as its other plan data. The linked-survey PDF report does not consume these survey sections.

- `20261015080000_field_survey_photos_handoff.sql` permits `semanticType` to be absent from a measurement and validates it as `coalesce(..., 'custom')`. `20261015120000_unified_field_survey_workspace.sql` adds nullable `sections` snapshots while retaining that measurement validator. This is persisted-contract evidence, not an inference from a TypeScript cast.
- Legacy revisions with null `sections` use their flat `work_type`, `measurements` and `notes` fields. The reader retains this fallback.
- Non-null section snapshots must contain 1–30 sections; their section/measurement fields and IDs are constrained by the migrations. The current domain `surveySectionsSchema` enforces the corresponding current section contract, including array cardinality and uniqueness.
- F9.70's parent implementation passed section JSON through without validation. F9.70's reader parsed each section against `surveySectionSchema`, whose measurement schema requires `semanticType`. Thus a supported old section array was rejected. The same issue affected flat fallback measurements if the field was absent.
- The consumer already used `measurement.semanticType ?? "custom"` when preparing the gable drawing. The adapter makes that established interpretation explicit in the typed read model; persisted numeric values, units, labels, section IDs and revision provenance are unchanged.

## Classification

| Input/behavior | Classification | Result |
|---|---|---|
| Current valid section snapshot | COMPATIBLE | Validated with the current domain schema. |
| Historical section measurement without `semanticType` | REGRESSION, fixed | Normalized in memory to `custom`, as the persisted contract specifies. |
| Legacy flat revision with `sections: null` and no `semanticType` | COMPATIBLE, fixed | Uses the flat fallback and the same narrow default. |
| Null/non-array `sections` | COMPATIBLE | Uses the legacy flat fallback, as before. Only the null case has a fixture. |
| Empty `sections` array | CORRUPTED | Rejected; the database contract requires at least one section. Previously the reader returned a misleading empty linked survey. |
| Unknown properties, invalid types/enums, malformed sections | CORRUPTED | Rejected by the current section-list schema and surfaced as a descriptive reader error. |
| Historical enum values outside the current domain | UNVERIFIED | No persisted migration or fixture found that establishes such values as valid. |
| Hosted historical rows / pre-snapshot history | UNVERIFIED | No hosted database was accessed; prior edits before revision snapshots existed cannot be reconstructed. |

## Integrity and error behavior

Normalization applies only while reading and only when the `semanticType` property is absent. Present-but-invalid values and extra properties remain rejected; current write schemas are unchanged. The reader still filters links, revisions and current surveys by `organization_id`, matches the exact revision ID and survey ID, and signs only the snapshot photo object keys. Revision immutability, source records and database contents were not changed.

An invalid linked section now rejects `getExecutionPlanLinkedSurveys` with a specific error instead of a raw Zod error or an empty result. Since the page uses `Promise.all`, one corrupted linked revision still prevents the whole plan page from rendering; the app-level error boundary offers retry. Isolating a bad link into a per-record UI warning would require a separate UI/data-contract change and was outside this milestone.

## Verification

- Historical behavior was compared read-only against parent `cf1182e` and the F9.7.8.2/F9.7.9/F9.44.5 migration contracts. No checkout/reset or hosted DB access was performed.
- Added regression cases for historical section and flat snapshots without `semanticType`, strict rejection of extra fields, and rejection of an empty section list. Existing tests cover null-section fallback, exact revision association, missing revisions, signed photo URLs and organization filters.
- Verification: execution suite **6 files / 22 PASS**; lint **PASS**; full Vitest **160 files PASS / 8 SKIP, 941 PASS / 19 SKIP**; isolated `npm run typecheck` **PASS**; isolated `npm run build` **PASS** (Next.js 16.4.2 Webpack, 32 static pages); `git diff --check` **PASS**.
- The active development-server process list was inaccessible (`ps` permission denied), so type generation and build ran in a temporary isolated copy with its own `.next`; the main checkout's `.next` was not used.
- Database/pgTAP, hosted RLS/Storage and browser rendering were not run. Survey sections are not part of the execution PDF data contract, so PDF snapshot behavior is not applicable to this reader change.

## Changed files

- `src/features/execution/execution-data.ts`
- `src/features/execution/execution-data.test.ts`
- `docs/HISTORICAL_SNAPSHOT_COMPATIBILITY_F9.70.1.md`
- `docs/PROGRESS.md`
