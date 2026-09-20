# Current Feature

> **Generated file.** Holds the one feature, fix, or rollback being built right now. Run
> `/feature <number-or-name>` to spec a build-plan feature, or `/fix "<bug>"` for
> an ad-hoc fix. Use `/rollback <completed-feature>` to plan a safe reversal.
> Build one thing at a time; `/complete` archives it under
> `blueprint/history/` and resets this file.

## Hero block editor cleanup, array field UX, and live-preview staleness fix

**Type:** Fix
**Status:** verified
**Branch:** `fix/hero-button-link-undefined-href`

Started as one ad-hoc fix and grew, in the same working session, into a
bundle of related admin-editor and live-preview fixes. Bundled into one
work item rather than split after the fact - see build steps below for the
distinct pieces.

### The problem

1. **Hero Buttons `Link` prop-type warning.** Adding a new "Buttons" row in
   the Hero block's live preview (after removing one, or as a second row)
   rendered `<Link href={undefined}>` for a moment, since live preview
   merges unsaved form state before the row's required `label`/`url` are
   filled in.
2. **Hero block editor layout.** The Layout (radio) options were buried at
   the bottom of the field list instead of the top, with no grouping
   between layout/overlay/appearance concerns and content concerns, and no
   way to separate them into tabs without breaking the shared "Edit"
   accordion's auto-collapse/nudge behavior (which assumed only page-level
   tabs, not a block's own internal tabs, could ever be clicked).
3. **Button(s)/Heading/Subheading/Image labels** were inconsistent in
   wording ("Buttons" for a max-2 field) and visually mismatched (an array
   field's label renders ~50% larger than a plain field's by Payload
   default).
4. **Page-level "Content" tab name** didn't reflect that it holds the whole
   block-based layout, not just content.
5. **Buttons/Links array fields** (Hero, Header's CTA buttons, CallToAction)
   always rendered fully expanded with generic "Button 01"/"Link 01" row
   labels, even once filled in.
6. **Live-preview staleness for globals.** Saving Header (or Footer/
   Settings), then switching to a different document's live preview via
   the admin sidebar, kept showing the pre-save version until a manual
   live-preview refresh - confirmed to be two compounding causes, not one.

### The fix

1. Filter Hero's `links` down to rows with a real `url` before rendering,
   so an in-progress blank row is skipped rather than rendered broken.
2. Wrap Hero's fields in a `tabs` field (Content first, Layout second).
   Fixed the shared `InformationTabEditAutoCollapse`/`BlockFieldSync`
   accordion logic, which assumed all `.tabs-field__tab-button` clicks were
   page-level tabs, to instead recognize any tab button inside a block's
   own row (`ROW_SELECTOR`) as internal navigation - always allowed, but
   still gated (blocked + Save nudged) when that specific block has
   unsaved changes, scoped correctly to the block that owns the clicked
   tab rather than whichever block's listener happens to run first. Added
   `programmaticBlockClick.ts` so `BlockFieldSync`'s own synthetic
   open/close/tab-switch clicks (used to auto-manage the accordion as
   Live Preview focus moves) are never mistaken for a real user click by
   that same guard. Removed the auto-collapse-on-save behavior per
   explicit request - "Edit" now stays open after a save instead of
   closing itself.
3. Renamed the array field's label to "Button(s)"; added
   `admin.className` + a `custom.scss` rule matching Heading/Subheading/
   Image's label font-size/line-height to the array field's (Payload
   renders an array's label as an `<h3>`-wrapped `<span>`, not the
   `<label>` its own `FieldLabel` CSS targets).
4. Renamed the Pages collection's "Content" tab to "Content / Layout".
5. Set `admin.initCollapsed: true` plus a `RowLabel` component
   (`ArrayRowLabel`, extended with a `fallbackLabel` prop) on Hero's
   `links`, Header's `ctaButtons`, and CallToAction's `links`, so each row
   shows its own button/link text (or "Button 01"/"Link 01" while empty)
   instead of always being fully expanded.
6. Two independent causes, both fixed:
   - `livePreviewPath()` resolved Header/Footer/Settings and the Pages
     "home" doc all to the identical `/` - Payload's live-preview iframe is
     keyed only by that URL string (confirmed in `@payloadcms/ui` source),
     so switching between any two of them never changed `src` and the
     iframe never reloaded. Added a `__livePreviewDoc` query marker unique
     per document so each gets a distinct URL (same real route).
   - `revalidateGlobal.ts` only called `revalidateTag`, never
     `revalidatePath` - unlike `revalidatePage.ts`'s already-documented
     pattern, which needs both. Since Header/Footer/Settings render in the
     shared root layout, added `revalidatePath('/', 'layout')` to bust the
     cached render for every route, not just `/`.

### Build steps

1. [x] Guard Hero's `links.map` render against a `url`-less row
   (`src/blocks/Hero/Component.tsx`).
   - Done when: adding/removing a Buttons row in Live Preview no longer
     warns, and a filled-in button still renders correctly.
2. [x] Split Hero's fields into a Content/Layout `tabs` field; fix the
   shared accordion-guard code to recognize block-internal tab clicks
   (real and programmatic) instead of misreading them as page-level
   navigation.
   - Done when: clicking between Hero's own Content/Layout tabs never
     collapses "Edit"; a block with unsaved changes blocks + nudges Save
     on its own internal tab switch; switching blocks in Live Preview
     still opens/closes the right accordion; "Edit" no longer auto-closes
     after a successful save.
3. [x] Rename the Buttons array label to "Button(s)"; match Heading/
   Subheading/Image label font size to it.
4. [x] Rename the Pages "Content" tab to "Content / Layout".
5. [x] Collapse Hero/Header/CallToAction's button-ish array fields by
   default with a per-row custom label.
6. [x] Fix live-preview staleness for globals: distinct per-document
   preview URLs, plus `revalidatePath` in `revalidateGlobal.ts`.
   - Done when: saving Header, then switching to Pages' Home live preview
     via the admin sidebar, shows the change on the very first load.

### Verify

1. `npm run lint`, `npm run build`, and `npx vitest run` (full suite) all
   pass.
2. In the admin, open the Hero block: confirm Content/Layout tabs, that
   switching between them never collapses "Edit", and that "Edit" stays
   open after Save.
3. Add/remove a Buttons row in Live Preview - no console warning; confirm
   the array shows collapsed with real row labels.
4. Edit Header (e.g. add a social link), save, then switch to Pages' Home
   document's live preview via the sidebar - confirm the change appears
   on first load, no manual refresh needed.
