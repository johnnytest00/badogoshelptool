# F9.73 — Workspace reliability and related-record isolation

## Verdict

**PASS WITH LIMITATIONS.** A malformed or missing linked survey revision no longer rejects the execution-plan page. Valid linked surveys remain visible beside an explicit warning for each unavailable source. A failed optional survey read is reported as unavailable; recognized authorization failures are reported separately. Exact quotation-source reads are now validated and remain hard failures when their provenance cannot be proved.

## Workflows and failure boundaries

| Workflow | Required data | Optional/independent data | Failure behavior |
|---|---|---|---|
| `/kivitelezes/[planId]` | Organization access, plan, execution tasks, journal, events, photos, verified source quotation/revision when linked | Project display fields, linked surveys, material lists, linked documents and quotation candidates | The linked-survey section now has its own explicit result state. Required workspace reads still fail the route. The other optional loaders remain in the page's shared `Promise.all` and can still reject the page. |
| Execution overview | Plans and their task/journal/photo counts | None of the aggregate reads can be omitted without making counts incomplete | Query errors remain hard failures; partial counts would be misleading. |
| Project execution summary / new plan | Project/organization and execution workspace | Existing execution records where no plans exist | Required parent and workspace failures remain hard failures. |
| Execution PDF | Authorized project, plan and selected source data; selected private photos when requested | Linked survey panel data is not part of the report | Exact source quotation/revision verification failure rejects workspace loading, preventing a misleading quotation section. The route has no explicit conversion for this loader error. |

## Confirmed defects and behavior

- A missing exact linked revision/current survey was silently skipped, which could be mistaken for “no survey”. A malformed or empty section snapshot rejected `getExecutionPlanLinkedSurveys`; since the execution page included it in a shared `Promise.all`, one bad revision blocked the entire page.
- An optional survey query error also propagated through the page. RLS/authorization errors must not be shown as an empty relationship.
- A rejected signed-URL promise for a single survey photo could reject the whole linked-survey read, even though the photo is independently displayable.
- Source quotation and revision query errors were ignored, allowing a plan with immutable source IDs to appear as if it had no quotation data. The PDF uses those fields, so this could misstate provenance.
- Missing/corrupt revisions, transient failures in non-survey optional page loaders, and malformed rows in unrelated workflows were not all reproducible from available local fixtures. These are not claimed as confirmed production incidents.

## Changes

- Linked survey loads now return `loaded`, `unavailable`, or `access_denied`. A loaded collection preserves the exact revision association and represents each missing or invalid linked source as an explicit unavailable item. Valid siblings continue to render.
- The UI distinguishes a genuinely empty link list from read failure, denied access, an invalid snapshot, and an unavailable exact source. Transient panel failures offer `router.refresh()` retry. Failed photo signing only affects that photo.
- The loader retains explicit organization filters, exact revision/survey matching and the F9.70.1 read-only compatibility rule for absent historical `semanticType` values. No snapshot is rewritten or replaced with a newer revision.
- When a plan has quotation source IDs, the loader now requires the exact accepted quotation and finalized revision to be readable and mutually consistent before exposing the workspace. This stays a hard failure; neither the page nor PDF receives fabricated or incomplete source values.

## Integrity, authorization and export

`20261016120000_execution_plan_survey_workflow.sql` defines composite organization-scoped foreign keys for survey, revision and plan links, and an RLS policy requiring organization membership and an accessible same-organization plan/survey. The reader also filters every linked survey/revision query by the selected `organization_id`. Authorization codes (`42501`, `PGRST301`, `PGRST302`, HTTP 401/403) are classified as denied, not missing. These are source/migration and mock-test guarantees; hosted RLS was not run.

The execution report does not read linked survey sections. It does read the execution workspace's exact quotation source fields. A source query/read/match failure is now a hard loader failure, so no PDF is rendered with a silently absent source quotation. This route currently does not map that exception to an explicit HTTP 502 response.

## Verification

- Added/updated regression coverage for valid workspace output, empty workspace, exact source query failure and quote/revision mismatch, supported legacy survey fields, malformed and empty snapshots, mixed valid/invalid links, access denial, temporary survey-query recovery and photo signing failure.
- Added component checks for unavailable/retry, access denied and mixed valid survey plus corrupt sibling UI states.
- Focused execution verification: **7 files / 30 tests PASS**; full Vitest: **161 files passed, 8 skipped; 949 tests passed, 19 skipped**; lint PASS; isolated typecheck PASS; isolated Next.js 16.4.2 Webpack build PASS (32 static pages); `git diff --check` PASS.
- Authenticated local DEMO browser smoke: opened the work-log list and one linked-survey detail. The page rendered with its journal, linked documents and survey card. Corruption, access-denied, retry and mixed-record states were verified by component tests, not induced in the live dataset. No hosted database/RLS or real storage-failure verification is claimed.

## Remaining limitations

- The execution detail route still groups required workspace data and other optional sections (material lists, linked documents and quote candidates) in one `Promise.all`. Their query failures can still block the route. Isolating them safely needs their own explicit UI states and is not included without a demonstrated independent fault contract.
- Required task, journal, event and execution-photo query failures remain hard failures because the editable plan/history would be incomplete. Project parent failures remain hard failures.
- PDF source failures reject the route rather than returning a purpose-built error response. Browser smoke covered valid DEMO data only; live fault injection and hosted RLS verification remain outstanding.

## Suggested commit

`fix(F9.73): isolate related workspace failures`
