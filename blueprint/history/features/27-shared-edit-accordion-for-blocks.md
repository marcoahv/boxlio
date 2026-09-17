# Current Feature

**Title:** Shared "Edit" accordion for blocks
**Type:** Feature
**Status:** verified
**Branch:** `feature/shared-edit-accordion-for-blocks`

## Goal

Extend the Information tab's custom "Edit" accordion behavior (Pages/Posts) -
collapsed by default, auto-collapses when idle, nudges instead of losing
unsaved work, blocks tab-switching while unsaved, an in-accordion Save
button, and a secondary-color border - to every page-builder block, via one
shared, reusable field factory. Every block currently in the registry
(`Hero`, `FeatureGrid`, `CallToAction`, `RichTextBlock`, `Table`) and the two
blog-only blocks (`FeaturedPost`, `BlogListing`) get it. Any block added to
`src/blocks/registry.ts` afterward gets it automatically, with no per-block
opt-in code.

**Revised after trying it live:** having both the block's own native row
accordion and the nested "Edit" accordion independently collapsible was
confusing - two toggles per block. The block's native row now stays always
open with its own collapse ability removed entirely; only the nested "Edit"
accordion still opens/closes. The secondary-color border moves from the
"Edit" accordion to the block's own outer row, so the Information tab's Edit
accordion (unaffected by any of this) keeps the color it already has, and a
block's outer row - now the one thing that's always visible - carries it
instead.

**Revised again after trying that:** the outer row's border was always
colored (its `:not(.collapsible--collapsed)` condition is now permanently
true, since it never collapses), unlike the Information tab's, which is only
colored when open or hovered. Step 7 keys the color off whether the nested
"Edit" is open instead, matching that same open-or-hovered pattern. Step 7
also makes the outer row's own (now inert) header open "Edit" on click, so
either header does the same thing, rather than only the inner one working.

## In scope

- A new shared field factory (`src/fields/editAccordion.ts`) that wraps a
  block's own fields in the same `type: 'collapsible'` "Edit" pattern already
  shipped for the Information tab, reusing its two existing components
  (`InformationTabEditAutoCollapse`, `InformationTabSaveButton`) and its
  existing `info-tab-edit-collapsible` CSS class for behavior (border styling
  is reassigned in steps 5-6 - see the revision note above).
- One new optional behavior on `InformationTabEditAutoCollapse`: a
  `skipForcedCollapseIfFresh` prop (default `false`) that, when `true`, skips
  forcing the accordion closed on mount for a block that was just added in
  the current session (detected via `useFormInitializing()` - see Notes for
  the AI), while still forcing it closed for a block that already existed
  when the document loaded. Pages/Posts never pass this prop, so their
  already-shipped behavior is provably unchanged.
- Wiring the new factory into every block in `src/blocks/registry.ts`
  (automatic, for every current and future registry entry) and into
  `FeaturedPost`/`BlogListing` explicitly (they intentionally sit outside the
  registry).
- A focused unit test for the new factory's output shape.
- CSS-only removal of the block row's own native collapse ability (hide its
  toggle button and the blocks field's "Collapse All" action, rather than
  fighting Payload's internal collapse/preference state - see Notes for the
  AI), covering both places a block can render: the classic `blocks`-type
  field (`Pages.blocks`, the two blog-only blocks) and blocks embedded in a
  Post body via Lexical's `BlocksFeature`.
- Moving the secondary-color border CSS from the "Edit" accordion to the
  block's own outer row, for the same two surfaces, while leaving the
  Information tab's Edit accordion border exactly as already shipped.

## Out of scope

- `src/collections/Pages/config.ts` and `src/collections/Posts/config.ts` -
  their Information tab "Edit" accordion is already shipped and verified;
  this feature does not touch it or migrate it onto the new shared factory.
- Any new visual style beyond what `.info-tab-edit-collapsible` already
  provides (same border, same header type styling).
- Replacing the block row's own native Payload accordion component (its
  drag/reorder, add/duplicate/remove, the block-type picker). Confirmed with
  the user that Payload exposes no config flag to disable a block row's own
  collapsing, and the only way to fully replace that component
  (`admin.components.Block`) means reimplementing all of the above ourselves
  - out of scope, same reasoning as ruling out "recreate the block from
    scratch" earlier in this feature. The CSS-only approach in steps 5-6
  suppresses the native row's collapse *interaction* without replacing or
  forking the component itself.
- Role-based restrictions on who can use the accordion - there's no role
  system in this project yet.

## Build loop

Per `blueprint/config.json`: `workflow.stepReview` is `"feature"`, so the
steps below run as one continuous pass with a single review packet at the
end, not a pause after each step. `workflow.checkpointCommits` is
`"disabled"`, so no intermediate commits - `/complete` creates the one final
commit after review.

## Build steps

1. [x] Add `skipForcedCollapseIfFresh` to
   `src/custom/information-tab-edit-autocollapse/Component.tsx`: read
   `useFormInitializing()` from `@payloadcms/ui` once at mount (inside the
   existing mount-only effect, not as a new dependency), and when the prop is
   `true` and the form had already finished initializing at that moment,
   return early instead of scheduling the forced `toggle()`. Leave every
   other behavior (idle auto-collapse, save-triggered collapse, the nudge,
   the tab-switch guard) unchanged. Nothing calls the component with this
   prop yet.
   Done when: `npm run build` passes, and manually reloading a Page or Post's
   Information tab in the browser still auto-collapses "Edit" ~400ms after
   load exactly as before (the prop is never passed there, so behavior is
   unchanged by construction).

2. [x] Add `src/fields/editAccordion.ts` exporting `editAccordionField(fields:
   Field[]): Field[]`, matching the `appearanceField()`/`headerAppearanceField()`
   pattern in `src/fields/appearance.ts`. It returns one `type: 'collapsible'`
   field: `label: 'Edit'`, `admin: { initCollapsed: true, className:
   'info-tab-edit-collapsible' }`, whose `fields` are, in order: a `ui` field
   rendering `InformationTabEditAutoCollapse` with `clientProps: {
   skipForcedCollapseIfFresh: true }`, a `ui` field rendering
   `InformationTabSaveButton`, then the given `fields` unchanged. Add
   `tests/int/editAccordion.int.spec.ts` (plain Vitest, no Payload runtime
   needed, same style as `tests/int/pagination.int.spec.ts`) asserting: the
   return value is a single `collapsible` field with the right `label`/
   `admin`; its `fields` start with the two `ui` fields in order; the
   auto-collapse field's `clientProps.skipForcedCollapseIfFresh` is `true`;
   and the trailing fields equal the input array unchanged.
   Done when: `npm run test:int` passes, including the new spec.

3. [x] In `src/blocks/registry.ts`, rename the existing literal array to a
   private `rawBlockConfigs`, then derive the exported `blockConfigs` by
   mapping each entry through `{ ...block, fields: editAccordionField(block.fields)
   }`. Update the file's own doc comment: adding a block to `rawBlockConfigs`
   (step 2 of "to add a block") now gets the Edit accordion automatically,
   nothing extra required. Run `npm run generate:importmap` and `npm run
   generate:types`.
   Done when: `npm run generate:types` produces an empty `git diff -- src/
   payload-types.ts` (the collapsible/ui fields add no data path); in the
   browser, adding or opening a Hero/FeatureGrid/CallToAction/RichTextBlock/
   Table block on a Page shows its fields behind a collapsed-by-default
   "Edit" accordion with an in-accordion Save button, and the block row's
   own native drag/reorder controls still work unchanged. (Its border color
   and collapse behavior are steps 5-7, below - this step predates that
   revision.)

4. [x] Apply `editAccordionField()` explicitly to `fields` in
   `src/collections/Pages/blogBlocks/FeaturedPost/config.ts` and `.../
   BlogListing/config.ts` (both currently spread `...appearanceField()`
   directly - wrap that array, plus `BlogListing`'s `heading` field, the same
   way). Update each file's doc comment to note it applies the shared Edit
   accordion explicitly because it sits outside the shared registry. Run
   `npm run generate:importmap` and `npm run generate:types` again.
   Done when: `npm run generate:types` stays an empty diff; in the browser,
   adding `Featured Post` or `Blog Listing` to the `blog` page's Blog Blocks
   tab shows the same collapsed-by-default "Edit" accordion.

5. [x] In `src/fields/editAccordion.ts`, add a second class,
   `block-edit-collapsible`, alongside the existing `info-tab-edit-collapsible`
   on the wrapping collapsible's `admin.className` (space-separated - keep
   `info-tab-edit-collapsible` too, since `InformationTabEditAutoCollapse`
   still needs it to find its own wrapper via `closest()`, and the Information
   tab's border styling still keys off it). In
   `src/custom/admin-timestamps/styles.css`, add `:not(.block-edit-collapsible)`
   to the two existing `.info-tab-edit-collapsible` border-color selectors, so
   a block's "Edit" accordion stops getting the branded border (falls back to
   Payload's untouched default) while the Information tab's keeps it exactly
   as shipped.
   Done when: `npm run test:int` still passes (the factory's shape assertions
   need their expected class string updated); in the browser, opening a
   block's "Edit" accordion shows Payload's plain default border, and the
   Information tab's "Edit" still shows the secondary-color border as before.

6. [x] Add new rules to `src/custom/admin-timestamps/styles.css` (already the
   shared stylesheet loaded on every Page/Post edit view, covering every
   block instance too - see Notes for the AI) for the block row's own outer
   border and collapse removal, targeting both places a block renders:
   - Outer-row border, open and hover, matching the existing color pattern:
     `.blocks-field__row.collapsible` (Pages.blocks, both blog-only blocks)
     and `.LexicalEditorTheme__block__row.collapsible` (blocks embedded in a
     Post body via `BlocksFeature`).
   - Hide each surface's own row-level toggle button:
     `.blocks-field__row.collapsible > .collapsible__toggle-wrap >
     .collapsible__toggle` and the same under
     `.LexicalEditorTheme__block__row.collapsible`.
   - Hide the classic blocks field's "Collapse All" action only (keep "Show
     All" - re-expanding is harmless):
     `.blocks-field__header-actions li:first-child`.
   Done when: `npm run build` still passes (CSS-only, but confirms nothing
   else broke); in the browser, every block's outer row shows the
   secondary-color border (dark when not hovered, lighter on hover) and has
   no visible or clickable way to collapse it - only its nested "Edit"
   accordion still opens/closes - for a block added via the Layout tab, a
   block added to the `blog` page's Blog Blocks tab, and a block embedded in
   a Post's rich text body.

7. [x] Two more refinements after trying steps 1-6 live (the "Either header
   expands Edit" bullet below was later removed entirely by step 23 - kept
   here as a checked step since the border-color bullet still stands):
   - **Border only when selected or hovered, not always-on.** Step 6's outer-
     row border rule keyed off `:not(.collapsible--collapsed)`, which is now
     always true (the row never collapses), so it painted every block's
     border permanently, unlike the Information tab's (only colored open or
     hovered). Replace it with `:has(.block-edit-collapsible:not(.collapsible--collapsed))`
     on the same two outer-row selectors - "selected" now means this block's
     own nested "Edit" is open, the nearest equivalent left once the outer
     row itself can't be collapsed. Keep the existing `:hover` rule
     (unchanged, already correct) declared after it, so hovering still wins
     the color while the "Edit" state does not change.
   - **Either header expands "Edit".** Add one more effect to
     `InformationTabEditAutoCollapse`: from the same `wrapper` this component
     already resolves, additionally find the enclosing block row
     (`closest('.blocks-field__row, .LexicalEditorTheme__block__row')` - a
     no-op, correctly, for the Information tab's Edit, which has no such
     row) and its `.collapsible__toggle-wrap` header. On a click there that
     doesn't land on a real interactive descendant (drag handle, row
     actions, the block-name input, any button/link), open this accordion
     if it's currently collapsed, using the same `toggle` already in scope -
     no cross-component signaling needed, this component already renders
     inside the "Edit" accordion it controls. Never closes from this
     listener; only the nested "Edit" header's own native click still does
     that.
   Done when: `npm run test:int` and `npm run build` still pass; in the
   browser, a block's outer row shows the plain default border at rest,
   turns the secondary-dark color only while its "Edit" is open, and turns
   the lighter secondary color on hover regardless of "Edit" state; clicking
   anywhere in the outer row's header (not on the drag handle or row action
   buttons) opens "Edit" exactly like clicking the "Edit" header itself
   does, for a block on the Layout tab, a blog-only block, and a block
   embedded in a Post's rich text body.

8. [x] Swap step 7's two outer-row border colors: `var(--color-secondary,
   ...)` (the lighter/base shade) while "Edit" is open ("selected"), and
   `var(--color-secondary-dark, ...)` on hover - the reverse of step 7 and
   of the Information tab's own pattern above it. The rest state (neither)
   stays Payload's untouched default border - no override declared for it.
   Done when: `npm run test:int` and `npm run build` still pass (CSS-only);
   in the browser, a block's outer row is the plain default border at rest,
   the base secondary color while its "Edit" is open and not hovered, and
   the darker secondary color on hover (whether or not "Edit" is open).

9. [x] Fix a real bug in step 7/8's `:has()` selector: reported "not
   working" (border stuck on the "selected" color, never reverting to
   default). Root cause, confirmed by reading `@payloadcms/ui/dist/fields/
   Collapsible/index.js`: `admin.className` (our `block-edit-collapsible`)
   lands on the collapsible-*field*'s own outer wrapper div, a *different*,
   outer element from the one actually carrying `.collapsible`/
   `.collapsible--collapsed` (its child, the raw `Collapsible` UI
   primitive) - they are not the same node. `.block-edit-collapsible
   :not(.collapsible--collapsed)` as one compound selector was therefore
   always true (that class never appears on the wrapper itself, so `:not()`
   was vacuously satisfied), matching unconditionally regardless of actual
   open/closed state. Fix: `.block-edit-collapsible > .collapsible
   :not(.collapsible--collapsed)` (direct child) in both `:has(...)`
   selectors - this also prevents the rule from ever firing off some
   unrelated nested collapsible elsewhere in the block's own fields (e.g. an
   expanded array row), which the un-scoped form would have been just as
   vulnerable to.
   Done when: `npm run test:int` and `npm run build` still pass; in the
   browser, a block's outer row is the plain default border at rest,
   confirmed by actually collapsing "Edit" and watching the border revert
   (not just checking the open state, which is what step 8's own Done-when
   evidence missed).

10. [x] ~~Widen step 7's click-to-expand target from just the block row's~~
    **Reverted by step 23** - the whole click-to-expand-via-outer-row
    mechanism was removed once "Edit"/"Done" became its own clear label.
    header (`.collapsible__toggle-wrap`) to the whole block row
    (`BLOCK_ROW_SELECTOR` itself), so clicking anywhere in the block - not
    only its header strip - opens "Edit". Safe to widen this far: the same
    ignore-list (real interactive descendants: inputs, buttons, links, the
    drag handle, row actions) still applies, and once "Edit" is open
    `stateRef.current.isCollapsed` is already `false`, so a click landing
    anywhere non-interactive inside the row's own content is a harmless
    no-op rather than a second toggle - no new guard needed for that case.
    Done when: `npm run test:int` and `npm run build` still pass; in the
    browser, clicking any non-interactive spot in a collapsed block - not
    just its header - opens "Edit", for a block on the Layout tab, a
    blog-only block, and a block embedded in a Post's rich text body; the
    drag handle, row action buttons, and (once "Edit" is open) the block's
    own field inputs are unaffected.

11. [x] ~~Make a click on the block row's own header
    (`.collapsible__toggle-wrap`) a real toggle - open *and* close - mirroring
    the nested "Edit" header's own native behavior, instead of open-only.~~
    **Reverted by step 23**, same as step 10.
    Elsewhere in the row (step 10's wider area: whitespace, or the block's
    own content once "Edit" is open) stays open-only, on purpose - closing
    on a stray click inside the fields being edited would be surprising, and
    there's nothing else out there worth closing once it's already open.
    Done when: `npm run test:int` and `npm run build` still pass; in the
    browser, clicking a block's header while "Edit" is open closes it again
    (in addition to opening it while closed, from step 7), while clicking
    elsewhere in an already-open block's row does not close it, for a block
    on the Layout tab, a blog-only block, and a block embedded in a Post's
    rich text body.

12. [x] Hide the border on a block's own nested "Edit" accordion entirely
    (`.block-edit-collapsible > .collapsible { border-color: transparent
    !important; }` in `admin-timestamps/styles.css`) - the block's outer row
    already carries the branded border (steps 6/9), so a second, plain
    default border immediately inside it added nothing. `border-color`, not
    `border: none`, so border-width/spacing stay put and nothing reflows.
    `!important` guarantees this beats Payload's own default/hover
    border-color rules regardless of stylesheet load order. The Information
    tab's own Edit accordion is untouched (different rule, scoped by
    `:not(.block-edit-collapsible)` - see above).
    Done when: `npm run build` still passes (CSS-only); in the browser, a
    block's nested "Edit" accordion shows no border at all, open or closed,
    hovered or not, while its outer row's branded border (steps 6-9) is
    unaffected, and the Information tab's own Edit accordion still shows its
    existing border unchanged.

13. [x] ~~Eliminate the padding around a block's own "Edit" header/toggle
    strip.~~ **Reverted by step 16** - the user asked for the padding
    *inside* the header strip back; see step 16.

14. [x] Eliminate the padding *outside* the "Edit" accordion - the block's
    outer row has its own `.collapsible__content` wrapper (@payloadcms/ui's
    shared default: `padding: var(--base)`) around whatever it contains -
    today just our sole "Edit" field - which is what visibly separates the
    block's own header above from "Edit" below it, and pads its
    left/right/bottom too.
    Done when: `npm run build` still passes (CSS-only); in the browser, a
    block's "Edit" accordion sits flush against the block's own header with
    no visible gap above, below, left, or right of it, while its expanded
    content still has normal padding around the actual fields.

15. [x] Step 14 shipped with no visible effect ("no change visible") - same
    class of bug as step 9: `.blocks-field__row.collapsible >
    .collapsible__content` assumed a direct-child relationship that doesn't
    exist. `.collapsible__content` sits three levels deeper, through
    `AnimateHeight`'s own two wrapper divs (`elements/AnimateHeight/
    index.js`: an outer `rah-static` div, then an unstyled display-toggling
    div, then the actual `.collapsible__content` Collapsible.js passes as
    `children`) - the `>` combinator silently matched nothing. Fix: a plain
    descendant combinator (correct for the real depth), combined with
    `:not(.block-edit-collapsible .collapsible__content)` (a full selector
    argument, not just a class - valid, well-supported by 2026) so it still
    excludes the *nested* `.collapsible__content` several levels further
    down that belongs to "Edit" itself (padding around the block's actual
    fields once open, which must stay - a plain descendant selector alone
    would have reached that one too).
    Done when: `npm run build` still passes; in the browser, a block's
    "Edit" accordion actually visibly sits flush against the block's own
    header now (not just claimed to, per step 14's own miss), while its
    expanded content still has normal padding around the actual fields.

16. [x] Revert step 13: restore Payload's default padding on a block's own
    "Edit" header/toggle strip (`.collapsible__toggle-wrap`) - remove the
    `.block-edit-collapsible > .collapsible > .collapsible__toggle-wrap {
    padding: 0; }` rule entirely. The user wanted only the *outside* padding
    (steps 14-15) eliminated, not the padding inside the header strip
    itself.
    Done when: `npm run build` still passes (CSS-only); in the browser, a
    block's "Edit" header strip shows Payload's normal default padding
    around its label again.

17. [x] Hide the (now-decorative) chevron in the block's own outer header
    (`.collapsible__actions-wrap > .collapsible__indicator`) - it reflects
    the outer row's own `isCollapsed`, permanently `false` since it can no
    longer collapse, so it would always point "up" regardless of whether
    "Edit" is actually open or closed; a stale, misleading signal rather
    than a useful one. Direct-child chain the whole way down from
    `.collapsible` (toggle-wrap > actions-wrap > indicator are true direct
    children of one another, unlike `.collapsible__content` in step 15 -
    this path never goes through `AnimateHeight`, so `>` is correct here,
    verified against the actual JSX in `elements/Collapsible/index.js`
    before writing it this time). The inner "Edit" accordion's own chevron
    is untouched - it still legitimately reflects Edit's own open/closed
    state.
    Done when: `npm run build` still passes (CSS-only); in the browser, a
    block's outer header shows no chevron/arrow icon, while "Edit"'s own
    header keeps its (still meaningful) chevron.

18. [x] ~~Remove the block outer row's hover border-color effect entirely.~~
    **Reverted by step 19** - "hide the hover color effect" meant the
    header's *background* tint, not the border; see step 19. The border
    hover rule from step 9 is back exactly as it was.

19. [x] Neutralize the block outer header's background-color hover tint
    instead (@payloadcms/ui's own default: `var(--theme-elevation-50)` at
    rest, `var(--theme-elevation-100)` on hover -
    `elements/Collapsible/index.scss`'s `&__toggle-wrap` rules) - repeat the
    resting value on `:hover` so nothing visibly changes on mouseover,
    rather than trying to unset back to some assumed transparent/inherited
    value. Direct child of `.collapsible` (same safe path as the toggle/
    indicator rules - doesn't go through `AnimateHeight`). Four
    class-equivalent selectors beats Payload's three (`.collapsible__toggle-
    wrap:not(.toggle-disabled):hover`) outright; no `!important` needed.
    The border hover effect (step 9, restored by step 18's revert) is
    untouched - this is the background only.
    Done when: `npm run build` still passes (CSS-only); in the browser,
    hovering a block's outer header shows no background-color change,
    while the block row's own border hover color (step 9) still works.

20. [x] A reactive, centered "Edit"/"Done" label for a block's own accordion.
    New `src/custom/block-edit-label/Component.tsx` (`BlockEditLabel`, a
    `CollapsibleFieldLabelClientComponent`) reads `useCollapsible().isCollapsed`
    and renders "Edit" when collapsed, "Done" when open, inside a `<div
    className="block-edit-label">` (`width:100%; text-align:center` in a
    sibling `styles.css`, per the project's no-inline-styles standard).
    Works because Payload's `collapsible`-field component renders its
    `Label` custom component *inside* the same `CollapsibleProvider` the raw
    accordion uses (confirmed in `@payloadcms/ui/dist/fields/Collapsible/
    index.js`), so `useCollapsible()` resolves correctly there. Wired via
    `admin.components.Label` in `editAccordionField()` - the static `label:
    'Edit'` stays (Payload requires a label whether or not a custom
    component is given) but becomes inert once a custom `Label` is set. The
    Information tab's own "Edit" (different code path, not built through
    this factory) is untouched.
    Done when: `npm run build` and `npm run test:int` still pass; in the
    browser, a block's "Edit" accordion shows text that reads "Edit" while
    collapsed and "Done" while open, for a block on the Layout tab, a
    blog-only block, and a block embedded in a Post's rich text body.
    **Alignment changed after trying it:** `.block-edit-label`'s
    `text-align` moved from `center` to `right` - still `width: 100%` in the
    same stylesheet, just the one property.

21. [x] Block closing a block's "Edit" accordion (a "Done" click) while
    there's something unsaved - nudge Save instead, exactly like the
    existing tab-switch guard. Covers both ways to close it: the nested
    accordion's own native toggle button, and the outer row's header (step
    11). Opening is never blocked, only closing while `modified`. Refactor:
    `getNudgeTarget`/`clearNudge`/`nudge` move from being defined inside one
    `useEffect` to the component body, so both the existing tab-switch-guard
    effect and the block-row-header effect can call the same `nudge()` - each
    already only reads `markerRef.current` at call time, so being redefined
    every render (not `useCallback`-memoized) is harmless even for an effect
    with a `[]` dependency array that captured an earlier render's copy
    (documented inline with an `eslint-disable-next-line` on each affected
    effect, matching the file's existing pattern for its very first effect).
    Done when: `npm run build`, `npm run test:int`, and `npm run lint` all
    still pass with no new warnings; in the browser, with a block's "Edit"
    open and something unsaved, clicking either its own header or the
    block's outer row nudges Save and leaves "Edit" open, instead of
    closing; with nothing unsaved, both still close it normally.

22. [x] Fix a related bug surfaced while building step 21: both the
    tab-switch-guard effect and the block-row-header effect resolved "is
    this a click on my own header" via `e.target.closest(...)`, which finds
    the *nearest* matching ancestor - wrong once a block's own fields
    contain another collapsible (e.g. an expanded array field's own row,
    such as FeatureGrid's `features`), since clicking *that* row's header
    while "Edit" is open would incorrectly match as this accordion's own
    header too. Fixed by resolving each accordion's own header once, via
    `querySelector`'s first-document-order match (the header always renders
    before its content) rather than per-click `closest()`, then checking
    `.contains(e.target)`. Affects both the "block Done without saving"
    guard (step 21) and the pre-existing "either header expands/closes Edit"
    behavior (step 11) it shares the same lookup with.
    Done when: `npm run build` and `npm run test:int` still pass; in the
    browser, on a FeatureGrid block with "Edit" open and at least one
    feature row, clicking that row's own header to expand/collapse it does
    not also close "Edit".

23. [x] Remove steps 7/10/11's block-row-header-click effect entirely - now
    that "Edit"/"Done" is its own clear, right-aligned label (step 20), the
    outer block row's own header no longer needs to double as a toggle
    target too. Only the nested accordion's own native header (already
    reactive, already guarded against closing while unsaved by step 21)
    opens/closes "Edit" going forward. Deleted the whole fourth `useEffect`
    from `InformationTabEditAutoCollapse` (`blockRow`/`blockRowHeader`/
    `onRowClick`), plus the now-unused `BLOCK_ROW_SELECTOR` and
    `BLOCK_ROW_CLICK_IGNORE_SELECTOR` constants (`TOGGLE_WRAP_SELECTOR`
    stays - still used by step 21's own-toggle guard). Also removed the
    `cursor: pointer` rule on the outer header's `.collapsible__header-wrap`
    from step 11 (`admin-timestamps/styles.css`) - it's no longer a click
    target, so hinting that it was one would be misleading. Everything else
    from steps 6-9/12-19 (no native collapse ability, the outer row's
    branded border/no-hover-color, the hidden chevron, the padding
    adjustments) is untouched - this only removes the *extra* click target,
    not the "can't collapse the outer row" behavior itself.
    Done when: `npm run build`, `npm run test:int`, and `npm run lint` all
    still pass; in the browser, clicking anywhere in a block's outer
    header/row (not on "Edit"/"Done" itself) does nothing, while clicking
    "Edit"/"Done" still opens/closes it exactly as before, for a block on
    the Layout tab, a blog-only block, and a block embedded in a Post's rich
    text body.

## Files / areas

- New: `src/fields/editAccordion.ts`
- New: `tests/int/editAccordion.int.spec.ts`
- Modified: `src/custom/information-tab-edit-autocollapse/Component.tsx`
- Modified: `src/blocks/registry.ts`
- Modified: `src/collections/Pages/blogBlocks/FeaturedPost/config.ts`
- Modified: `src/collections/Pages/blogBlocks/BlogListing/config.ts`
- Regenerated, expected empty diff: `src/payload-types.ts`
- Regenerated, expected little/no diff: `src/app/(payload)/admin/importMap.js`
  (same component paths already imported for Pages/Posts)
- Reused as-is, not modified: `src/custom/information-tab-save/Component.tsx`
- Modified (steps 5-6): `src/fields/editAccordion.ts` (second class),
  `src/custom/admin-timestamps/styles.css` (border scoping + new outer-row
  border and collapse-removal rules)
- Modified (step 7): `src/custom/admin-timestamps/styles.css` (border rule
  reworked to `:has()`), `src/custom/information-tab-edit-autocollapse/
  Component.tsx` (new block-row-header-click effect)
- New (step 20): `src/custom/block-edit-label/Component.tsx`,
  `src/custom/block-edit-label/styles.css`
- Modified (step 20): `src/fields/editAccordion.ts` (`admin.components.Label`)
- Modified (steps 21-22): `src/custom/information-tab-edit-autocollapse/
  Component.tsx` (shared nudge helpers, the close-while-unsaved guard on
  both toggle paths, and the header-resolution fix both share)
- Untouched, explicitly out of scope: `src/collections/Pages/config.ts`,
  `src/collections/Posts/config.ts`

## Data / contracts

No stored-data or generated-type changes: `collapsible` and `ui` fields add
no data path, so every block's generated interface in `src/payload-types.ts`
(`HeroBlock`, `FeatureGridBlock`, `CallToActionBlock`, `RichTextBlock`,
`TableBlock`, `FeaturedPostBlock`, `BlogListingBlock`) must stay byte-for-byte
unchanged - this is the empty-diff check in Build steps 3 and 4, not an
assumption.

New internal-only contract: `InformationTabEditAutoCollapse`'s
`skipForcedCollapseIfFresh` prop (optional, default `false`). Not a stored
field or API shape - a client-component prop passed via `admin.components.
Field.clientProps` in `editAccordionField()`.

## Testing

- `tests/int/editAccordion.int.spec.ts` (new, Vitest, `npm run test:int`) -
  covers `editAccordionField()`'s pure config output, per the project's
  scope rule (logic with an assertable right answer). This is the only
  automated coverage this feature adds.
- No Browser tests command is declared for this project, so the accordion's
  actual runtime behavior (auto-collapse timing, the unsaved-change nudge,
  the tab-switch guard, the Save button, both border colors, the native
  block row's own collapse ability actually being gone, drag/reorder still
  working) is UI/integration behavior verified manually in the browser
  during `/implement`'s Done-when checks and `/check`, not by an automated
  test - consistent with this project's "what not to test" rule.

## Notes for the AI

- Reuse `InformationTabEditAutoCollapse` and `InformationTabSaveButton`
  as-is; the only change to either is the new optional prop on the former.
  Do not fork or duplicate them.
- `UIFieldClientComponent` is not a generic type - type the new prop via an
  intersection (e.g. `Parameters<UIFieldClientComponent>[0] & {
  skipForcedCollapseIfFresh?: boolean }`), not a type argument.
- Read `useFormInitializing()`'s value only from the closure of the existing
  `useEffect(() => { ... }, [])` (empty dependency array) - it must keep
  running exactly once, at mount, like today. Do not add it to the
  dependency array or introduce a second effect for it.
- Every block type has its own isolated `fields` schema, so reusing the same
  two `ui` field names (e.g. `blockEditAutoCollapse`/`blockEditSave`) across
  every block, and across the two blog-only blocks, is safe - exactly like
  `surface` is already reused across every block via `appearanceField()`.
- Reuse the existing `.info-tab-edit-collapsible` class for every block's new
  accordion - do not invent a new class or duplicate the CSS in
  `src/custom/admin-timestamps/styles.css`. That's what gives every block the
  same secondary-color border for free.
- Multiple block "Edit" accordions, plus the Information tab's, can be
  mounted at once. `InformationTabEditAutoCollapse` already scopes itself
  correctly per instance (`closest('.info-tab-edit-collapsible')` from its
  own marker, and the nudge target is queried within that same scoped
  wrapper) and each instance's document-level click-capture listener
  independently reacts to the same whole-form `modified` flag - this already
  behaves correctly with any number of simultaneous instances; do not add
  new cross-instance coordination.
- The in-accordion Save button always saves the whole document (every block
  plus every tab), exactly like the Information tab's - not a per-block save.
  Multiple simultaneously-visible Save buttons across open blocks is expected.
- A `collapsible` field with a required field inside it (e.g. Hero's
  `heading`, or `links`' `label`/`url`) auto-expands on a validation error -
  this is existing Payload behavior the shipped Information tab feature
  already relies on, not something to build here.
- Do not touch `src/collections/Pages/config.ts` or
  `src/collections/Posts/config.ts` - out of scope, and their current
  behavior must stay provably unchanged (verified by never passing the new
  prop there).
- Steps 5-6 are CSS-only, deliberately not touching Payload's `blocks`-field
  internals or the Lexical block component, both confirmed by reading the
  actual installed source (`node_modules/@payloadcms/ui/dist/fields/Blocks/`,
  `node_modules/@payloadcms/richtext-lexical/dist/features/blocks/client/
  component/index.js`):
  - Payload's block-row `Collapsible` always renders its content in the DOM
    (height-animated, not unmounted) and its own toggle `<button>` is a
    normal clickable element with a stable class - hiding it with CSS is
    safe and simple; fighting the collapse *state* itself (which persists to
    `payload-preferences` per row ID for the classic `blocks` field) would
    not be.
  - A freshly-added classic block, and every block embedded in a Post body
    via Lexical (its collapsed state defaults to `false` and is *not*
    persisted across a reload - it lives in the rich text field's own
    transient form state, unlike the classic `blocks` field), both already
    render expanded by default - so hiding the toggle does not strand any
    new block in a collapsed, unreachable state.
  - One accepted edge case: a classic `blocks`-field row that some earlier
    session already left collapsed has that state stored in
    `payload-preferences`, keyed by field path + row ID, independent of
    anything this feature changes. Hiding the toggle means that one specific
    row would need its stored preference cleared (or the CSS rule
    temporarily removed to re-expand it once) rather than a click to recover
    - worth a quick check for any block already collapsed before shipping
    step 6, given how early-stage this project is.
  - Exact confirmed class names: block-row baseClass is `blocks-field`
    (`@payloadcms/ui`) and `LexicalEditorTheme__block` (richtext-lexical's
    default theme, unconfigured in this project's `lexicalEditor()` calls -
    confirm this hasn't changed if `payload`/`richtext-lexical` are upgraded
    before this ships). The shared `Collapsible` element's own toggle button
    is `.collapsible__toggle` inside `.collapsible__toggle-wrap`, a *direct*
    child of the row - use a direct-child selector so this never matches the
    nested "Edit" accordion's own toggle several levels deeper in the same
    subtree.
- Step 7's border rule originally used
  `:has(.block-edit-collapsible:not(.collapsible--collapsed))`, wrongly
  assuming `.block-edit-collapsible` and `.collapsible` sit on the same
  element - **step 9 corrected this**: `admin.className` lands on the
  collapsible-field's own outer wrapper div, a different, outer element from
  the one actually carrying `.collapsible`/`.collapsible--collapsed` (its
  direct child, the raw `Collapsible` UI primitive - see
  `@payloadcms/ui/dist/fields/Collapsible/index.js`). The corrected,
  currently-shipped form is `.block-edit-collapsible > .collapsible
  :not(.collapsible--collapsed)` (direct child). This same wrapper/inner
  split is why step 12's border-hiding rule below also targets
  `.block-edit-collapsible > .collapsible`, not `.block-edit-collapsible`
  alone.
- Step 7's "either header expands Edit" effect works because
  `InformationTabEditAutoCollapse` already renders *inside* the "Edit"
  accordion it controls (it's one of that accordion's own `fields`), so it
  already has `toggle`/`isCollapsed` in scope via `useCollapsible()` - no
  need to reach across to another component or simulate a click on a real
  button. It walks *up* from its own wrapper to find the enclosing block row
  and attaches one more listener there; nothing new is needed to make this
  a no-op on the Information tab, since `closest('.blocks-field__row,
  .LexicalEditorTheme__block__row')` simply finds nothing there.
- The `.collapsible__header-wrap`/`.collapsible__toggle-wrap`/
  `.collapsible__drag`/`.collapsible__actions-wrap` classes referenced in
  steps 6-7 all come from the one shared `Collapsible` primitive
  (`@payloadcms/ui`) both surfaces render through, so the same class names
  apply identically under `.blocks-field__row` and
  `.LexicalEditorTheme__block__row` - only the outer row class itself
  differs between the two surfaces.

## Follow-up after archiving

Requested and shipped on the same branch, one commit, after this feature was
already archived and committed: the block's outer-row border no longer
changes color on hover, only when "selected" (its nested "Edit" is open).
Removed `.blocks-field__row.collapsible:hover` /
`.LexicalEditorTheme__block__row.collapsible:hover`'s `border-color` rule
from `admin-timestamps/styles.css`; the `:has(...)` selected-state rule is
unchanged. (An earlier attempt in the same conversation to *move* this same
hover color onto "Edit"'s own header instead of removing it was requested,
built, and then explicitly canceled before merge - this is a separate,
later request to remove it outright, not that move.)
