# Current Feature

**Title:** Cross-document edit hint
**Type:** Feature
**Status:** verified
**Branch:** `feature/cross-document-edit-hint`

## Goal

Build plan item 29c. Feature 29b made Header's `navLinks[].label`/
`ctaButtons[].label`, Footer's `navLinks[].label`, and Settings' `siteName`
(via Footer's copyright line) click-to-edit in Live Preview, but only while
each field's *owning* document is the one open. Every other time - most
commonly a Page open in Live Preview, since Header/Footer render on every
route - clicking one of those same links today does nothing visible at all:
`LivePreviewNavGuard` (pre-existing) already suppresses its navigation inside
Live Preview, and it isn't editable there either. This feature replaces that
silent no-op with a small, non-editable hint ("Open Header to edit") so the
existing own-document-only rule is visible instead of surprising, without
changing which document can edit what.

The mechanism is symmetric by construction, not scoped only to "a Page is
open": it fires for any of the four fields whenever genuinely inside *some*
Live Preview session and that field's own document isn't the open one - so
it equally covers Footer's nav links while Header or Settings is open, and
Header's while Footer is open. The build plan's wording names the Page
scenario because it's the common case, not because the mechanism should be
narrower than that.

## In scope

- A pure decision function, `shouldShowCrossDocumentEditHint(isInsideLivePreview,
  isFieldEditable)`, returning `isInsideLivePreview && !isFieldEditable` -
  mirrors the existing `shouldInterceptLivePreviewNavClick` pattern (pure
  decision separated from the DOM-handling call site).
- A thin hook, `useCrossDocumentEditHint(isFieldEditable: boolean): boolean`,
  wrapping the existing `useIsInsideLivePreview()` (generic "some Live
  Preview session is genuinely active" signal, already used by
  `LivePreviewNavGuard`) plus the decision function above.
- Applying it to the same four fields feature 29b wired up, each already
  computing its own `isEditable` via `useEditableField`:
  - Header's `navLinks[].label` and `ctaButtons[].label`
    (`HeaderNavLinkItem`/`HeaderCtaButtonItem` in `HeaderClient.tsx`) - hint
    label `"Header"`.
  - Footer's `navLinks[].label` (`FooterNavLink` in `FooterClient.tsx`) - hint
    label `"Footer"`.
  - Footer's borrowed `siteName` (`FooterCopyrightSiteName` in
    `FooterClient.tsx`) - hint label `"Site Identity › Information"` (the
    field's actual owning document's real admin label and tab, not `"Footer"`
    and not the internal `"settings"` slug - same borrowed-field rule feature
    29b already established for editability). Settings' `GlobalConfig.label`
    is literally `"Site Identity"`, not `"Settings"` - confirmed against
    `src/globals/Settings/config.ts`.
- A `data-cross-document-hint="<Label>"` marker, present only when
  `useCrossDocumentEditHint` returns `true`. For the nav-link/CTA-button
  fields it sits on the `<li>` wrapper, not the `<Link>` `useEditableField`'s
  `fieldProps` spreads onto - `.ui-link`'s own `overflow: hidden` clips an
  absolutely-positioned tooltip attached to the link itself (confirmed live).
  Settings' site name has no such wrapper conflict, so its marker stays
  directly on the `<span>`.
- A CSS-only tooltip keyed off that marker: a small "Open <Label> to edit"
  label shown on `:hover` only, absolutely positioned above the element
  (clear of its own text flow, so it never pushes nav/footer layout around).
  No `:focus`/`:focus-within` trigger (a click leaves the link focused
  without navigating, which left the tooltip stuck on screen) and no
  distinct cursor (`cursor: help`'s question-mark icon was tried and
  rejected); the marked element keeps whatever cursor it already has
  (`pointer` for a link). Uses the same fixed admin-tool accent color
  `_block-highlight.css`'s `[data-editable-field]` rule already established
  (not a site brand token - see that file's own reasoning), so it stays
  legible regardless of a given site's chosen colors.

## Out of scope

- Actually editing a Header/Footer/Settings field from a different document's
  Live Preview session. That would need a form mounted for a document that
  isn't open in the admin at all - a materially larger, riskier feature
  (raised and explicitly deferred during 29b's own review) with real save-
  conflict questions if that document is open elsewhere too. This feature
  only makes the existing restriction legible, it doesn't lift it.
- An equivalent hint on Pages/Posts' own block fields (e.g. Hero's heading)
  when some *other* document is open. The build plan names only Header/
  Footer elements; extending the same mechanism to every Pages block field
  would touch `useEditableField`/every block component, a materially larger
  surface than this feature's four fields. Left as a possible later
  extension, not assumed here.
- Header's `socialLinks`, and every Settings field besides `siteName` - same
  exclusions feature 29b already established (no plain-text label field, or
  established as non-reactive/non-text).
- Any change to `useEditableField`, `BlockFieldSync`, or the `block-text-edit`/
  `block-field-focus`/`block-field-blur` message bridge - this feature only
  adds a sibling "not editable, but here's why" affordance next to the
  existing editable one; the editing mechanism itself is untouched.
- Touch-device tap-and-hold tooltip behavior, keyboard-only discoverability,
  and any JS-driven show/hide state. The hint is CSS-only and `:hover`-only
  (see Data/contracts for why `:focus`/`:focus-within` was tried and
  rejected) - a deliberately narrower trigger than `[data-editable-field]`'s
  own existing `:hover`/`:focus` affordance.

## Build loop

Per `blueprint/config.json`: `workflow.stepReview` is `"feature"` and
`checkpointCommits` is `"disabled"`. Implement all steps below without
pausing for per-step approval or creating per-step commits; stop once every
step is done and present one feature-level review packet (full diff +
Done-when evidence for each step). `/complete` creates the final commit.

## Build steps

- [x] 1. **Foundation - decision function, hook, and CSS (inert until
  wired).**
  - Add `src/utilities/shouldShowCrossDocumentEditHint.ts` exporting
    `shouldShowCrossDocumentEditHint(isInsideLivePreview: boolean,
    isFieldEditable: boolean): boolean`, returning `isInsideLivePreview &&
    !isFieldEditable`.
  - Add `src/utilities/useCrossDocumentEditHint.ts` exporting
    `useCrossDocumentEditHint(isFieldEditable: boolean): boolean`, calling
    `useIsInsideLivePreview()` and passing both values through the function
    above.
  - Add a new shared partial, `src/globals/_cross-document-hint.css`
    (imported in `src/app/(frontend)/styles/index.css` next to Header/
    Footer's own imports - it spans both globals, matching
    `_block-highlight.css`'s own precedent for shared, not-tied-to-one-
    component marker CSS), with the `[data-cross-document-hint]` rule
    described in Data/contracts. Not referenced by any component yet.
  **Done when:** `npm run test:int` passes, including new cases in
  `tests/int/shouldShowCrossDocumentEditHint.int.spec.ts` (all four
  boolean combinations); `npm run lint` and `npm run build` clean; no visual
  or behavioral change anywhere yet (nothing renders the new attribute).

- [x] 2. **Header: nav-link and CTA-button hint.** In `HeaderNavLinkItem` and
  `HeaderCtaButtonItem` (`HeaderClient.tsx`), call `const showHint =
  useCrossDocumentEditHint(labelField.isEditable)` and spread
  `showHint ? { 'data-cross-document-hint': 'Header' } : {}` onto the same
  `<Link>` `labelField.fieldProps` already spreads onto.
  **Done when:** with a Page's (or Footer's, or Settings') Live Preview open,
  hovering a Header nav-link or CTA-button label shows "Open Header to edit"
  and the label stays non-editable and non-navigating (unchanged from
  today); with Header's own Live Preview open, the same labels are editable
  exactly as feature 29b left them, with no hint - verified by hand in the
  browser.

- [x] 3. **Footer: nav-link hint and borrowed site-name hint.** In
  `FooterNavLink`, wire the same pattern with hint label `'Footer'`. In
  `FooterCopyrightSiteName`, wire it with hint label `'Site Identity ›
  Information'` (the field's actual owning document and tab - not
  `'Footer'`).
  **Done when:** with a Page's (or Header's, or Settings') Live Preview open,
  hovering a Footer nav-link label shows "Open Footer to edit", and hovering
  the copyright line's site name shows "Open Site Identity › Information to
  edit"; with Footer's own Live Preview open, its nav links are editable
  with no hint, but the site name still shows the Site Identity hint
  (Footer isn't its owner); with Settings' own Live Preview open, the site
  name is editable with no hint, but Footer's nav links still show "Open
  Footer to edit" - verified by hand in the browser.

## Files / areas

- `src/utilities/shouldShowCrossDocumentEditHint.ts` - new, pure decision
- `src/utilities/useCrossDocumentEditHint.ts` - new, thin hook
- `src/globals/_cross-document-hint.css` - new, shared marker/tooltip CSS
- `src/app/(frontend)/styles/index.css` - import the new partial
- `src/globals/Header/Component/HeaderClient.tsx` - wire the hint into
  `HeaderNavLinkItem`/`HeaderCtaButtonItem`
- `src/globals/Footer/Component/FooterClient.tsx` - wire the hint into
  `FooterNavLink`/`FooterCopyrightSiteName`
- `tests/int/shouldShowCrossDocumentEditHint.int.spec.ts` - new

## Data / contracts

- **Decision function contract:** `shouldShowCrossDocumentEditHint(a, b) => a
  && !b` - pure, no side effects, the single source of truth for "should this
  field show the hint" so the four call sites can't drift from each other.
- **`useIsInsideLivePreview()` reuse, not a new signal:** already exists
  (`src/utilities/useIsInsideLivePreview.ts`, built for `LivePreviewNavGuard`)
  and already answers exactly "is a genuine Live Preview session active, for
  *any* document" - distinct from `useIsLivePreviewActive`'s per-document
  match. This feature adds no new postMessage listening.
- **Marker attribute:** `data-cross-document-hint="<Label>"`, `<Label>` one of
  `'Header'`, `'Footer'`, `'Site Identity › Information'` - a literal string
  per call site (the component already knows which document owns its own
  field), matching that document's real admin label, never derived at
  runtime from `globalSlug` or similar.
- **Marker placement:** on the `<li>` wrapper for nav-link/CTA-button fields
  (not the inner `<Link>` - `.ui-link`'s `overflow: hidden` clips the
  tooltip there), directly on the element for Settings' site name (a plain
  `<span>`, no such wrapper).
- **CSS technique:** `[data-cross-document-hint]::after { content: 'Open '
  attr(data-cross-document-hint) ' to edit'; }`, absolutely positioned
  (`position: relative` on the marked element, `position: absolute` on
  `::after`, explicit `width: max-content`) so it never becomes inline flow
  content that shifts nav/footer layout, shown via an `opacity` transition
  on `:hover` **only** - no `:focus`/`:focus-within` trigger, since a click
  leaves the link focused without navigating (`LivePreviewNavGuard`), and a
  focus-based trigger left the tooltip stuck on screen after a click instead
  of disappearing once the mouse moved away (confirmed live, rejected). No
  dedicated cursor either - the marked element keeps its own (`cursor:
  help`'s question-mark was tried and rejected too). Positioned above every
  caller, Header included - flipping it below inside Header's own bar
  clipped its background against the bar's own bounding box (confirmed
  live); above stays clear of that for both Header and Footer.
- **Never present at the same time as `[data-editable-field]`:** the decision
  function's `!isFieldEditable` term guarantees this - a field is either
  editable (29b's existing affordance) or hinted (this feature's), never
  both, and never neither-nor-a-real-visitor (no attribute at all outside
  Live Preview).
- **No new message, no new persistence path:** this feature reads only the
  existing `isInsideLivePreview` signal and each field's own already-computed
  `isEditable`; it posts nothing and writes nothing.
- **Accessible name left untouched, deliberately:** no `aria-label` is added
  to the marked `<Link>`/`<span>`. Overriding a link's accessible name to the
  hint text would replace its real destination name for assistive tech,
  which is wrong outside the specific moment this hover tooltip applies. The
  hint is a mouse/hover visual affordance for a sighted editor inside
  Payload's own Live Preview panel, not a persistent accessibility label.

## Testing

- `tests/int/shouldShowCrossDocumentEditHint.int.spec.ts` (Vitest, pure
  logic): all four `(isInsideLivePreview, isFieldEditable)` combinations,
  mirroring `tests/int/shouldInterceptLivePreviewNavClick.int.spec.ts`'s
  existing style for a pure decision function.
- Per `coding-standards.md`, the CSS-only tooltip and the hook's DOM/message-
  listening behavior (already covered by `useIsInsideLivePreview`'s own
  existing tests) are UI/integration surfaces, not unit-tested here - verify
  each build step by hand in the browser (hover each of the four fields from
  each of the "wrong" documents, per the Done-whens above). Same precedent
  29a/29b already established: no admin-authenticated Playwright fixture
  exists in this repo yet.
- `npm run test:int`, `npm run lint`, and `npm run build` remain the
  available automated evidence; no combined `Verify` command exists yet.

## Notes for the AI

- Reuse `useIsInsideLivePreview` exactly as it stands - do not add a second
  "is Live Preview active" listener. Its own doc comment already explains why
  it exists separately from `useIsLivePreviewActive` (content outside a
  specific document's own React tree can't ask "is *my* collection's preview
  active").
- The hint and the existing editable affordance are mutually exclusive by
  construction (see Data/contracts) - don't add a separate "both" visual
  state; there isn't one.
- Footer's site-name hint label is `'Site Identity › Information'` (Settings'
  real admin label and tab), not `'Footer'` and not the internal `'settings'`
  slug, even though the marked element lives in `FooterClient.tsx` - this is
  the same borrowed-field distinction feature 29b already drew between
  Footer's own fields and Settings' field rendered in place there.
- Keep the new CSS partial's selector scoped to `[data-cross-document-hint]`
  only - don't fold it into `_block-highlight.css` (that file is Pages/Posts
  block-specific, per its own header comment) or duplicate the tooltip
  technique inline in `_header.css`/`_footer.css`.

## Implementation notes

Three rounds of hands-on browser review reshaped the CSS/DOM details after
the initial implementation:

1. **Marker moved from `<Link>` to `<li>`.** `.ui-link`'s `overflow: hidden`
   silently clipped the tooltip when the marker lived on the link itself -
   the tooltip rendered but was invisible on every nav link (CTA buttons,
   using `.ui-btn` with no `overflow: hidden`, showed it fine, which is what
   first exposed the asymmetry). Moving the marker to the `<li>` wrapper,
   which has no such constraint, fixed it for both.
2. **Cursor affordance dropped.** `cursor: help` (a question-mark icon) was
   tried and explicitly rejected by request - the marked element now keeps
   whatever cursor it already had.
3. **Positioning simplified to "always above."** An initial attempt flipped
   the tooltip below the element specifically inside Header (reasoning: Header
   sits at the very top, so an upward tooltip might clip against the
   viewport). Live testing showed the opposite problem instead - flipping it
   below clipped its background against Header's own bar. Reverted to the
   shared "above" default for every caller, Header included.
4. **`:focus-within` trigger removed.** Originally added alongside `:hover`
   for keyboard-focus discoverability (matching `[data-editable-field]`'s own
   `:hover`/`:focus` affordance). Since a click on the marked link leaves it
   focused without navigating (`LivePreviewNavGuard` suppresses the
   navigation), this made the tooltip stick on screen after a click instead
   of disappearing once the mouse moved away. Removed - the hint is
   `:hover`-only now, a narrower trigger than the editable-field affordance
   it sits beside.
5. **Site-name hint label corrected.** Initially hardcoded as `'Settings'`
   (the internal slug). Settings' actual `GlobalConfig.label` is `'Site
   Identity'`, and the field itself lives on that global's Information tab -
   corrected to `'Site Identity › Information'` so the hint names what an
   editor would actually see and click in the admin nav.
