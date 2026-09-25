# Current Feature

> **Generated file.** Holds the one feature, fix, or rollback being built right now.

## Hero: text alignment for Split and Media Background layouts

**Type:** Fix

**Status:** verified

**Branch:** `fix/hero-text-align-all-layouts`

### The problem

`src/blocks/Hero/config.ts` already has an `align` radio field ("Text alignment":
Center / Left / Right, default Left), but it's gated to Text-only only:

```ts
admin: {
  condition: (_, siblingData) => siblingData?.layout === 'textOnly',
},
```

`src/blocks/Hero/Component.tsx` enforces the same restriction in render, even if
a value were somehow saved:

```ts
// Only the Text-only layout offers alignment - Split/Media Background keep
// their existing stretch/left behavior regardless of a stale `align` value.
const textAlign = layout === 'textOnly' ? (align ?? 'left') : 'left'
```

So Split and Media Background heroes have no way to center or right-align their
heading/subheading/buttons - they're stuck left-aligned.

### The fix

Widen `align` to Split and Media Background too. The rendering mechanism this
drives (`contentAlign` for the `Stack`'s `align`, `textAlignClass` for
`text-center`/`text-right` on the heading and subheading, and the button row's
`justify`) is already layout-agnostic - it was only ever gated by the one
`textAlign` ternary above. No new CSS or JSX branching is needed for Split or
Media Background specifically.

- `src/blocks/Hero/config.ts`: widen the `align` field's `admin.condition` from
  `siblingData?.layout === 'textOnly'` to
  `siblingData?.layout === 'textOnly' || siblingData?.layout === 'split' ||
  siblingData?.layout === 'backgroundImage'`. Keep its current position (after
  `mediaFill`, before `overlayCoverage`) and its `defaultValue: 'left'`, so this
  doesn't change behavior for any already-saved document (Split/Media
  Background docs have no `align` value yet, and `align ?? 'left'` already
  defaults to left in `Component.tsx`). Explicit three-way condition, not
  removing `admin.condition` outright, so the field still hides for legacy
  pre-consolidation `layout: 'imageRight' | 'imageLeft'` documents, matching
  how `headerPosition`/`mediaFill` already behave for those (see
  `blueprint/history/fixes/hero-layout-higher-level-choices.md`).
- `src/blocks/Hero/Component.tsx`: change
  `const textAlign = layout === 'textOnly' ? (align ?? 'left') : 'left'` to
  `const textAlign = align ?? 'left'`, and drop the now-stale comment above it.
  Everything downstream (`contentAlign`, `textAlignClass`, the button row's
  `justify={contentAlign}`) already reads `textAlign` generically - no other
  line changes.
- No `npm run generate:types` needed - `align`'s field shape/type is unchanged,
  only its admin visibility condition and one consumer line move.

**Must not break:** Split's `headerPosition` (which side the media sits on) and
`mediaFill` (Contained/Stretch/Full-bleed) are unrelated axes - alignment only
changes how the text block's own content is justified within its column, not
which column it's in. Media Background's `overlayCoverage: 'content'` wraps
text in a `w-fit` box; center/right alignment still applies correctly inside it
(shorter lines shift within the box's own width), same as it already does for
Text-only.

### Build steps

- [x] **Widen `align` to Split and Media Background.**
  - Update `config.ts`'s `align` field condition and `Component.tsx`'s
    `textAlign` line as described above.
  - Done when: a Split hero and a Media Background hero each expose the
    Text alignment radio (Center/Left/Right) on the Layout tab, and switching
    it visibly re-aligns the heading, subheading, and buttons together in live
    preview and on the published page - without moving the media itself or
    changing `headerPosition`/`mediaFill`/overlay behavior. A Text-only hero
    is unaffected. An existing saved Split or Media Background hero (no
    `align` value) still renders left-aligned exactly as before this step.

### Verify

- In the admin, add a Split hero: confirm Text alignment now appears on the
  Layout tab, cycle through Left/Center/Right, and confirm the heading,
  subheading, and buttons shift together in live preview and on the published
  page while the media stays put.
- Repeat for a Media Background hero, including with Overlay coverage set to
  "Text area only" (`overlayCoverage: content`).
- Confirm Text-only alignment still works unchanged.
- Load (or simulate) a pre-existing Split/Media Background hero with no
  `align` value saved and confirm it still renders left-aligned.

**Checks run:** `npm run lint` (0 errors), `npm run test:int` (79/79 passing),
`npm run build` (compiled successfully). `tsc --noEmit` is blocked project-wide
by a pre-existing `tsconfig.json`/installed-TypeScript mismatch, unrelated to
this change. Live/visual confirmation of the admin Layout tab and live preview
was not captured in this session.
