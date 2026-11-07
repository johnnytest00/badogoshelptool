# UI surface guidelines

## Direction

Use Liquid Glass as a shared material, not as a wrapper on every element. Surface strength follows meaning: work areas get appropriately weighted containers; controls and repeated data inside them stay visually lighter. Keep optional/supporting content quieter than the main task. These are shared principles, not a fixed page template; each module may keep a professionally justified structure that fits its work.

## Rules

- Keep the page background as the canvas; do not put the whole page in a single card.
- Prioritize professional clarity, fast task completion, and clear state feedback over visual minimalism or decoration.
- Give each coherent task an appropriately scoped primary work surface. A simple task may need one; a complex page may need several distinct work surfaces. Group related fields and actions by task, and do not force a single-panel layout across page types.
- Within a work surface, use typographic headings and hairline dividers where they improve scanning. Avoid another full glass card for every subsection.
- Render repeated records as aligned rows with subtle separators. Keep clear input boundaries and visible hover/focus states.
- Design mobile information hierarchy for the mobile workflow, not as a shrunken or merely stacked desktop layout. Keep fields, units, results, warnings, and actions together in the order and grouping needed to complete work on a phone.
- Give important results (such as an estimate) a separate, stronger summary surface.
- Use progressive disclosure only for genuinely optional or rarely needed content. Keep regularly used fields and critical warnings easy to find; compact disclosures should start closed only when hidden content is not needed for the current task.
- Keep save/submit actions easy to locate and visually distinct from content.
- Use consistent semantic states across modules: incomplete data, invalid calculations, unsaved changes, limited results, and successful actions each need clear, recognizable feedback that does not rely on color alone.
- For interactive Liquid Glass disclosures and rows, keep the resting surface on the shared glass palette. On hover, add a subtle theme-aware brand tint (about 8%) while keeping text and border colors unchanged; keyboard focus uses the same fill with a visible focus ring. Avoid opaque gray fills and keep this treatment consistent with the recipient/document disclosure in quotation editors.
- Keep separate disclosure controls as separate, equal-width panels with consistent outer alignment. Do not nest a disclosure inside another disclosure's frame or let a child panel inherit the parent's border, padding, or background; give expanded content its own intentional surface and spacing.
- Reuse existing glass, radius, spacing, color, and motion tokens. Preserve light/dark, reduced-transparency, forced-colors, keyboard, and responsive behavior.
- Keep surfaces on the same theme-aware glass palette; avoid one-off gray fills. Disabled states should change the affected control, not tint an entire group or row.
- Preserve the shared dotted page canvas and its subtle ambient lighting. The pattern is intentional and should remain visible around and between page surfaces; do not cover it with a full-page card or remove it to make content feel more unified.
- Avoid redundant **outer page frames**: a generic gray or opaque bordered shell (for example, `detail-surface`) should not wrap a page that already has purpose-built work, summary, disclosure, and action surfaces. Keep the page root transparent and frame only meaningful task groups.
- Use spacing and alignment to make the shared canvas between panels feel deliberate. Remove the redundant frame itself; do not treat the visible dotted canvas as bleed-through to hide.
- Inspect the full CSS cascade for state-specific overrides (`disabled`, `hover`, `focus`, media and accessibility modes) before calling a surface consistent.
- Do not force one layout onto every page type. Reuse the surface hierarchy while adapting forms, lists, workspaces, and detail pages to their tasks.
- Mark a checklist item complete only after its implementation is present and its necessary visual or functional verification has been performed. Record unverified checks as incomplete; do not infer success from code changes alone.

## Next-page assessment and tuning checklist

Before editing another page:

- [ ] Read this guide and identify the route, main component, and page archetype (form, list, workspace, or detail).
- [ ] Review the supplied screenshot and inspect the component plus all relevant CSS overrides, including state and responsive rules.
- [ ] Map each visible panel to its role: primary work, repeated data, result, optional disclosure, or action bar.
- [ ] Note competing borders, nested cards, redundant gray outer frames, spacing, alignment, and text hierarchy; distinguish intentional shared dotted canvas from a redundant panel around the whole page.
- [ ] Write a short page-specific change plan before implementation; do not wrap the whole page in a card by default.
- [ ] Tune only the surfaces that conflict with the guide, preserving business logic and accessible states.
- [ ] Review the changed page at desktop and mobile widths, plus reduced-transparency/forced-colors behavior where available; verify mobile task order and semantic state feedback.
- [ ] Check the content column at top, sides, between panels, and after the final action: preserve the shared dotted canvas and remove any redundant outer page frame.
- [ ] Record any visual checks that could not be completed and leave them unchecked rather than assuming success.

## Quotation editor checklist

- [x] Offer name and item list share one primary Liquid Glass work surface.
- [x] “Tételek” title and add-item actions read as one section header, not a nested card.
- [x] Item rows remain scannable and aligned without competing full-strength card borders or disabled-state gray fills.
- [x] Recipient/document fields and used sources remain separate, optional disclosures.
- [x] Estimate and save actions retain their own clear hierarchy.
- [ ] The editor page root stays transparent; the shared dotted canvas remains visible between its purpose-built surfaces.
- [ ] Small screens, focus visibility, reduced transparency, and forced colors remain supported.
- [x] No data, workflow, or business logic changes.

## Detail and workspace surface rules

Use these rules for project detail pages, work logs, dashboards, and other information-dense workspaces. They refine the shared Liquid Glass direction; they do not replace it with a generic design system.

- Build the page on a predictable 8 px spacing rhythm; use 4 px increments only for optical alignment, icon gaps, and compact metadata.
- Align related content to shared keylines: page header, action row, main surfaces, section labels, and supporting disclosures should start and end on a deliberate grid.
- Use content-driven height. Do not give an empty card the height of its populated reference state; populated rows may grow the surface naturally while the content remains top-aligned.
- Keep one visually dominant primary action per task area. Secondary actions must be distinguishable by treatment, not by competing accent colors or identical filled buttons.
- Keep controls close to the content they modify. Do not separate a label, value, status, or row action with excessive whitespace.
- Use progressive disclosure for optional detail, but keep the trigger, focus state, expanded content, and collapse behavior clear and consistent.
- Treat icon-only controls as compact visuals with full accessible names and touch targets of at least 44 CSS px; keep adjacent targets separated by at least 8 px.
- Preserve visible keyboard focus. A focus ring must remain discernible against both the component and the dotted canvas; do not rely on glow alone.
- Verify text and state contrast against the actual theme surface. Functional states must not be communicated by color alone.
- Keep mobile hierarchy intentional: preserve the order of the user's work, avoid horizontal overflow, and let controls wrap or scroll as a group without clipping labels.
- Do not add placeholder records, photos, counts, or addresses to make a reference screenshot look populated. Empty, loading, error, and populated states are separate compositions.
- Before delivery, inspect the full cascade for desktop, mobile, hover, focus, reduced-transparency, forced-colors, and reduced-motion overrides.

### Reference basis

- [Apple Human Interface Guidelines — Layout](https://developer.apple.com/design/human-interface-guidelines/layout): hierarchy, alignment, grouping, guides, progressive disclosure, and consistent spacing.
- [Material Design — Understanding layout](https://m2.material.io/design/layout/understanding-layout.html): predictable responsive regions and an 8 dp spacing rhythm.
- [Android accessibility — Touch target size](https://support.google.com/accessibility/android/answer/7101858): 48 dp touch targets and 8 dp separation as a practical mobile baseline.
- [WCAG 2.2](https://www.w3.org/TR/WCAG22/): contrast, target size, focus visibility, and focus-not-obscured requirements.
