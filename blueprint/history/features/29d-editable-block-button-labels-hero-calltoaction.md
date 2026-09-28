# Current Feature

**Title:** Editable block button labels (Hero, CallToAction)
**Type:** Feature
**Status:** verified
**Branch:** `feature/editable-block-button-labels-hero-calltoaction`

## Goal

Build plan item 29d. Feature 29a made Pages' block text fields (Hero's
heading/subheading, FeatureGrid's items, CallToAction's heading/body, etc.)
click-to-edit in Live Preview, but explicitly excluded every button/link
label ("Link/button labels... also present on `Header.ctaButtons`, out of
scope entirely here... clicking a link inside it navigates the iframe...
Resolving that conflict... is a follow-up, not part of 29a"). Feature 29b
resolved that exact conflict for Header/Footer's own links by suppressing a
link's default navigation while it's editable, added generically to
`useEditableField`'s `fieldProps.onClick`. This feature applies that
already-proven mechanism to the two remaining button-label fields 29a
deferred: Hero's `links[].label` (up to 2 buttons) and CallToAction's
`links[].label` (1-2 required links).

Unlike Header/Footer's top-level `navLinks`/`ctaButtons`, Hero's and
CallToAction's `links` are arrays *nested inside* a Pages block - the exact
shape `FeatureGrid`'s own `features[]` array already establishes a working
convention for (`blockId` is the *block's* own id, `fieldPath` is the full
path relative to the block, e.g. `links.2.label`). Reaching this field
requires no change to `useEditableField`, `BlockFieldSync`, the row-lookup
utilities, or the message bridge - every one of those already resolves this
exact shape correctly. This feature is per-block wiring only.

## In scope

- **Hero** (`src/blocks/Hero/Component.tsx`): make each button's `label`
  click-to-edit. Requires restructuring how `links` is filtered first - see
  Data/contracts for why the current `linkableLinks = links?.filter(link =>
  link.url)` breaks `fieldPath`'s index if left in place, and the required
  fix (filter *inside* the render, not before it, so each button keeps its
  true index into the full `links` array).
- **CallToAction** (`src/blocks/CallToAction/Component.tsx`): make each
  link's `label` click-to-edit. No pre-filtering exists here today, so this
  is wiring only, no restructuring.
- A small per-block subcomponent in each file (`HeroLinkButton`,
  `CallToActionLinkButton`) - not inlined in the `.map()` - so
  `useEditableField` can be called at each button's own top level, per the
  Rules of Hooks. Matches the existing `FeatureItem`/`HeaderNavLinkItem`
  precedent exactly; this project doesn't currently share one generic
  "editable link button" component across blocks, so this follows that same
  per-block pattern rather than introducing a new shared one.
- Reusing `useEditableField`'s already-generic `onClick` preventDefault
  (added in 29b) for the navigate-vs-edit conflict - no new click-suppression
  code.

## Out of scope

- `links[].url`, `variant`, or `color` - only the visible `label` text
  becomes inline-editable, matching every other "editable" feature in this
  series (label/heading/body text only, never a URL or a style choice).
- Any other block's button/link fields. Only Hero and CallToAction have a
  `links` array today (confirmed against every block's `config.ts` via the
  registry) - no other block is affected.
- The cross-document edit hint (feature 29c) extended to these buttons -
  29c's own spec explicitly left "an equivalent hint on Pages/Posts' own
  block fields... when some other document is open" as a later, unassumed
  extension. This feature only makes the buttons editable when their own
  Page is genuinely open in Live Preview (the same condition every other
  Pages block field already uses) - it does not add a hint for the case
  where a *different* document (e.g. Header) happens to be open while the
  homepage's Hero renders alongside it.
- Any change to `useEditableField`, `BlockFieldSync`, `blockRowLookup.ts`, or
  the `block-text-edit`/`block-field-focus`/`block-field-blur` message
  bridge - every one of these already handles this exact shape correctly
  (proven by `FeatureGrid`'s `features[]`); this feature is wiring, not
  bridge work.
- Posts and Lexical rich text - unchanged, every prior feature in this
  series' own exclusions stand as-is.

## Build loop

Per `blueprint/config.json`: `workflow.stepReview` is `"feature"` and
`checkpointCommits` is `"disabled"`. Implement all steps below without
pausing for per-step approval or creating per-step commits; stop once every
step is done and present one feature-level review packet (full diff +
Done-when evidence for each step). `/complete` creates the final commit.

## Build steps

- [x] 1. **Hero: editable button labels.** In `src/blocks/Hero/Component.tsx`,
  replace the pre-filtered `linkableLinks = links?.filter((link) =>
  link.url)` + `linkableLinks.map((link) => ...)` with a map over the full
  `links` array that renders `null` for a row with no `url` yet, so each
  rendered button keeps its true index (`links.map((link, index) => link.url
  ? <HeroLinkButton key={link.id ?? index} blockId={id} index={index}
  link={link} /> : null)`). Add `HeroLinkButton({ blockId, index, link })`
  calling `useEditableField({ blockId, fieldPath: \`links.${index}.label\`,
  value: link.label })`, rendering the existing `<Link>` (same
  `href`/`className` logic already there) with `{...labelField.fieldProps}`
  spread onto it and `{labelField.content}` in place of `{link.label}`.
  **Done when:** with a Page's Live Preview open on a Page containing a Hero
  block with at least one button, clicking the button's label text edits it
  in place (no navigation), typing updates the matching sidebar field
  (inside the Buttons array row) live and marks it unsaved, and Save
  persists it; with a second button added below it, editing the *second*
  button's label updates the second row, not the first (confirms the index
  fix) - verified by hand in the browser.

- [x] 2. **CallToAction: editable link labels.** In
  `src/blocks/CallToAction/Component.tsx`, add
  `CallToActionLinkButton({ blockId, index, link })` the same way, called
  from `links.map((link, index) => <CallToActionLinkButton key={link.id ??
  link.url} blockId={id} index={index} link={link} />)` (no pre-filtering to
  restructure here - map over `links` directly).
  **Done when:** with a Page's Live Preview open on a Page containing a
  CallToAction block, clicking a link's label text edits it in place, syncs
  to its sidebar field live, and Save persists it - verified by hand in the
  browser.

## Files / areas

- `src/blocks/Hero/Component.tsx` - restructure link filtering, add
  `HeroLinkButton`, wire `useEditableField`
- `src/blocks/CallToAction/Component.tsx` - add `CallToActionLinkButton`,
  wire `useEditableField`

## Data / contracts

- **`blockId`/`fieldPath` convention: reused, not new.** `blockId` is the
  *block's own* id (Hero's or CallToAction's `id` prop, already destructured
  in both components today), never the link row's own id. `fieldPath` is the
  full path relative to the block, `links.${index}.label` - identical in
  shape to `FeatureGrid`'s existing `features.${index}.title`. `BlockFieldSync`
  already resolves this correctly today (it locates the block's own row via
  `blockId`, then appends `fieldPath` verbatim) - confirmed by reading its
  current dispatch logic, not assumed.
- **Why Hero's filter must move inside the render:** `linkableLinks =
  links?.filter((link) => link.url)` computes a *new, re-indexed* array. If
  an earlier row lacks a `url` (a newly-added, not-yet-filled button, per the
  code's own existing comment), every later row's position in
  `linkableLinks` no longer matches its real position in `links` - dispatching
  `links.${linkableLinksIndex}.label` would silently write to the *wrong*
  row's label. The fix keeps the map over the real `links` array and skips
  rendering (`return null`) for a row with no `url`, so `index` is always the
  row's true position. This is a correctness fix required to make editing
  safe, not a cosmetic refactor.
- **No change to CallToAction's existing behavior:** it already maps over
  `links` directly (no pre-filter), so its index is already correct -
  confirmed by reading its current `Component.tsx`, not assumed.
- **Persistence/security: unchanged.** No new Local API call, hook, or
  endpoint. Save still goes through the Pages collection's existing Content
  tab editing flow and its existing access control.

## Testing

- No new pure-logic function is introduced (this is JSX wiring reusing
  existing hooks/utilities unchanged) - per `coding-standards.md`'s testing
  scope rule, there is nothing here that qualifies for a focused unit test.
- Verify both Done-whens by hand in the browser (Live Preview open, click,
  type, Save, and - for Hero specifically - the two-button index check).
  Same precedent 29a/29b/29c already established: no admin-authenticated
  Playwright fixture exists in this repo yet.
- `npm run test:int`, `npm run lint`, and `npm run build` remain the
  available automated evidence (confirming no regression elsewhere); no
  combined `Verify` command exists yet.

## Notes for the AI

- Do not introduce a new shared "editable link button" component across
  Hero/CallToAction/Header/Footer. The codebase's own established pattern
  (`FeatureItem`, `HeaderNavLinkItem`, `HeaderCtaButtonItem`, `FooterNavLink`)
  is a small subcomponent local to each file it's used in, not a shared one -
  follow that, even though the JSX is very similar across all of them.
- Hero's index fix (step 1) is the one place a naive port of the "just add
  `useEditableField`" pattern would silently produce wrong behavior - don't
  skip verifying the two-button case in that step's Done-when.
- Reuse the existing `key={link.id ?? index}` (Hero) / `key={link.id ??
  link.url}` (CallToAction) pattern already established in each file; don't
  invent a new key convention.

## Implementation notes

A dev-server error surfaced mid-review (`Can't resolve
'../../../globals/_cross-document-hint.css'`) that looked like a missing
file from feature 29c, but the file existed on disk at exactly that path and
`npm run build` compiled cleanly both before and after this feature's
changes. Diagnosed as a stale Turbopack module-graph cache, most likely from
switching branches (checkout/merge) outside normal file-watch events during
29c's completion - resolved by restarting the dev server, not a code fix.
