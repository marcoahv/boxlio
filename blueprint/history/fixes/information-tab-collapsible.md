# Current Feature

**Title:** Wrap the Information tab's content fields in a collapsible (Pages & Posts)
**Type:** Fix
**Status:** verified
**Branch:** `fix/information-tab-collapsible`

### The problem

The Information tab (Pages and Posts) currently lists every field flat: the
"Last Modified"/"Created" row from the last fix, then Title, Slug, and the
rest (Pages: Featured Image; Posts: Summary, Make Featured Post, Author,
Category, Date, Featured Image) all rendered inline with no grouping. The
user wants everything **except** "Last Modified"/"Created" grouped into a
collapsible section, so the tab opens with just the two read-only timestamp
fields visible and the actual editable content tucked into one
expand/collapse block.

This project already uses Payload's `type: 'collapsible'` layout field for
exactly this kind of grouping — see `headerAppearanceField()` /
`breadcrumbsField()` in `src/fields/appearance.ts` (`{ type: 'collapsible',
label: 'Appearance', admin: { initCollapsed: true, description: '...' },
fields: [...] }`). `collapsible` is presentation-only: it does not add a
name/path, so nothing nests under it in the stored document or in
`payload-types.ts` — the wrapped fields keep their existing top-level names
exactly as today.

### The fix

In both `src/collections/Pages/config.ts` and `src/collections/Posts/
config.ts`, leave the `updatedAt`/`createdAt` row exactly where it is (first
in the Information tab, unwrapped, always visible), then wrap every
remaining Information-tab field in one `type: 'collapsible'`:

**Pages** — wrap `title`, the `slugField()` row, and `featuredImage`:

```ts
{
  type: 'collapsible',
  label: 'Edit',
  admin: { initCollapsed: true, className: 'info-tab-edit-collapsible' },
  fields: [
    { type: 'text', name: 'title', required: true },
    slugField({ overrides: (field) => { field.admin = {}; return field } }),
    { type: 'upload', name: 'featuredImage', relationTo: 'media', required: true },
  ],
},
```

**Posts** — wrap `title`, the `slugField()` row, `summary`, `featured`,
`author`, `category`, `date`, `populatedAuthor` (already `admin.hidden`),
and `featuredImage` — i.e. everything currently in the Information tab
after the timestamp row:

```ts
{
  type: 'collapsible',
  label: 'Edit',
  admin: { initCollapsed: true, className: 'info-tab-edit-collapsible' },
  fields: [
    { type: 'text', name: 'title', required: true },
    slugField({ overrides: (field) => { field.admin = {}; return field } }),
    { type: 'textarea', name: 'summary' },
    { /* featured checkbox, unchanged */ },
    { /* author relationship, unchanged */ },
    { /* category relationship, unchanged */ },
    { /* date field, unchanged */ },
    { /* populatedAuthor group, unchanged */ },
    { type: 'upload', name: 'featuredImage', relationTo: 'media', required: true },
  ],
},
```

Every wrapped field keeps its exact current config (validation, `admin`
overrides, hooks) — only the enclosing `collapsible` wrapper is new. Labeled
"Edit" (revised from an initial "Details") and `admin.initCollapsed: true`
(revised from initially expanded), per the user's explicit follow-up
request — the tab now opens with just the two read-only timestamp fields
visible, and an editor clicks "Edit" to reveal Title/Slug/etc.

Must not break:
- The `updatedAt`/`createdAt` row's own behavior from the last fix
  (unwrapped, still first, still read-only, still no clear button).
- Every wrapped field's data path, validation, and admin behavior — a
  `collapsible` field has no `name`, so `Post`/`Page` in `payload-types.ts`
  must show no shape change, only a config restructure.
- The `featured` field's `validate` function, which reads `siblingData` —
  confirm it still resolves `slug` correctly as a sibling once nested one
  level deeper inside the collapsible (siblings are scoped to the nearest
  enclosing field group with data, and `collapsible` does not introduce a
  data scope, so `siblingData` should still see every field in the same tab
  exactly as today, including `slug` and `updatedAt`/`createdAt`) — verify
  this empirically per Build step 2's Done when.
- The Appearance/Content/Blog Blocks/SEO tabs — untouched.

### Follow-up: Save button inside the Information tab

The user wants a Save button inside the Information tab itself — like the one
Payload's document controls already render next to the preview eye icon — so a
change made there can be saved without scrolling back to the top bar.

The first attempt at a save button (see "Reverted" below) embedded `<SaveButton
/>` inside the "Edit" collapsible's `admin.components.Label`, which the user
reported broke something and asked to revert. This attempt places the button
differently: as a normal `type: 'ui'` field inside the "Edit" collapsible's own
`fields` array — not in the `Label`, so it isn't nested inside a
`RowLabel`/collapsible-header context, but still only visible once "Edit" is
expanded, per the user's explicit request that it not be visible without
expanding.

Ordered first in the collapsible's `fields` array, before `title` — but
right-aligned via CSS (`display: flex; justify-content: flex-end` on the
field's wrapper) rather than left-aligned like a normal field row, per the
user's explicit request to have it sit in the top-right corner of the
expanded "Edit" content, above Title.

`@payloadcms/ui` exports `SaveButton` directly (`node_modules/@payloadcms/ui/
dist/elements/SaveButton/index.js`) — it calls `useForm().submit()` on click,
using `useFormModified()`/`useOperation()` to mirror the top bar's disabled
state, and registers its own Cmd/Ctrl+S hotkey via `useHotkey`. Reuse it as-is
rather than reimplementing save logic.

New component: `src/custom/information-tab-save/Component.tsx`, a client
component (`'use client'`) exporting `InformationTabSaveButton`, importing
`{ SaveButton } from '@payloadcms/ui'` and rendering it inside a wrapper div
(`className="information-tab-save"`). Add a matching `src/custom/
information-tab-save/styles.css` (imported directly at the top of
`Component.tsx`, same technique `src/custom/admin-timestamps/Component.tsx`
uses):

```css
.information-tab-save {
  display: flex;
  justify-content: flex-end;
}
```

In both `src/collections/Pages/config.ts` and `src/collections/Posts/
config.ts`, add one `type: 'ui'` field as the first entry in the "Edit"
collapsible's `fields` array, before `title`:

```ts
{
  type: 'collapsible',
  label: 'Edit',
  admin: { initCollapsed: true, className: 'info-tab-edit-collapsible' },
  fields: [
    {
      name: 'informationTabSave',
      type: 'ui',
      admin: {
        components: {
          Field: '/src/custom/information-tab-save/Component#InformationTabSaveButton',
        },
      },
    },
    { type: 'text', name: 'title', required: true },
    // ...remaining fields unchanged...
  ],
},
```

Run `npm run generate:importmap` after adding the component path.

Must not break (in addition to the list above):
- Two mounted `SaveButton` instances (top bar + this one) each register their
  own Cmd/Ctrl+S hotkey listener — verify pressing the hotkey still saves
  exactly once with no console error or duplicate request, since this is the
  likely failure the previous attempt hit. If it does double-submit, that's a
  reason to drop the hotkey rather than reimplement it here (e.g. a thin
  wrapper around `useForm().submit()` without `useHotkey`) — decide empirically
  during `/implement`, not in advance.
- The new `ui` field must add no data path — `git diff -- src/payload-types.ts`
  after `npm run generate:types` must stay empty.
- The button's disabled state still matches the top bar's (disabled until the
  form is modified; disabled mid-upload).

### Follow-up: Auto-collapse the "Edit" accordion itself

Corrected scope after the first draft of this follow-up targeted the wrong
element: the Save button from Build step 5 **stays exactly as it is** (no
hover/fade behavior on the button itself). What collapses is the "Edit"
accordion — the same `type: 'collapsible'` field from Build steps 1-4 that
wraps Title/Slug/etc.

**Expanding stays exactly as it already works today: clicking the "Edit"
header.** Hovering or focusing it never expands it — those only *guard
against auto-collapsing* while genuinely in use. Confirmed directly with the
user after an earlier draft of this spec wrongly had hover/focus triggering
an expand.

- Collapsed by default — already true via `initCollapsed: true` (step 3), but
  reinforced below so a stale expanded preference can't override it (see
  "Payload's collapsible persists its open/closed state" below).
- However it became expanded (a click, same as always), it auto-collapses
  again once **all** of: there's nothing to save, the mouse isn't hovering
  it, and nothing inside it has focus.
- Collapses immediately on a successful save, even while still hovered or
  focused — a save always wins over the hover/focus guard.

**Payload's collapsible field has no controlled `isCollapsed` prop** — the
`type: 'collapsible'` field (`@payloadcms/ui/dist/fields/Collapsible/
index.js`) always manages its own open/closed state internally and persists
every toggle to the signed-in user's admin preferences (a real `POST /api/
payload-preferences/<key>` per toggle — confirmed in `providers/Preferences/
index.js`). There's no `admin.components.Field` override for `collapsible`
either (Payload's `CollapsibleField` type only exposes `admin.components.
Label`, already tried and reverted). Reimplementing the whole accordion from
scratch (Payload's lower-level `Collapsible` UI element does accept a
controlled `isCollapsed`) would avoid the preference-write side effect
entirely, but means hand-rolling the field-rendering plumbing
(`RenderFields` with the right `parentPath`/`indexPath`/`parentSchemaPath`)
that today's native field handles for us — a much bigger, riskier diff than
this fix's history so far.

Take the smaller path instead: keep the native `type: 'collapsible'` field
exactly as-is, and drive it from the inside. Any field nested in a
collapsible's `fields` array renders underneath that collapsible's own
`CollapsibleProvider`, so it can call `useCollapsible()` (also exported from
`@payloadcms/ui`) to read `{ isCollapsed, toggle }` and flip the real accordion
open/closed. `toggle()` only flips whatever the current state is — always
check `isCollapsed` before calling it, so an idle check while already
collapsed doesn't fire a redundant preference write.

New component: `src/custom/information-tab-edit-autocollapse/Component.tsx`,
exporting `InformationTabEditAutoCollapse` — a second `type: 'ui'` field,
placed first in the "Edit" collapsible's `fields` array (before
`informationTabSave` and `title`, so it mounts early). It renders no visible
UI of its own (just a hidden marker span), and only manages the accordion's
open/closed state as a side effect. It never calls `toggle()` to open it —
only to close it. It:

1. On mount, if `isCollapsed` is `false` (a stale "expanded" preference from
   a previous session), calls `toggle()` once to force it closed — this is
   what makes "collapsed by default" hold on every page load, not just the
   very first one before any preference exists.
2. Finds the accordion's own DOM wrapper via `element.closest('.info-tab-
   edit-collapsible')` (the same `admin.className` hook Build step 4 added)
   from a ref on a zero-size marker span, then attaches native
   `mouseleave`/`focusout` listeners to that wrapper — native listeners, not
   React's `onMouseLeave`/`onBlur`, because leaving the accordion's
   **header** (outside this field's own subtree) must count too, and only a
   shared ancestor sees both.
3. On either event, checks — at that moment, using `wrapper.matches(':hover')`
   and `wrapper.contains(document.activeElement)` rather than tracking hover/
   focus booleans by hand — whether the mouse is still over the wrapper or
   focus is still inside it. If either is true, or there's something to
   save, does nothing. Only collapses (`toggle()`, guarded by `isCollapsed`)
   when all three are false: not hovered, not focused, nothing to save.
4. Watches `useFormModified()` flip `true` → `false` (the "just saved"
   transition) and collapses immediately when it does, regardless of current
   hover/focus state — a save always overrides the hover/focus guard.

```tsx
'use client'
import { useEffect, useRef } from 'react'
import { useCollapsible, useFormModified } from '@payloadcms/ui'
import type { UIFieldClientComponent } from 'payload'

const WRAPPER_SELECTOR = '.info-tab-edit-collapsible'

export const InformationTabEditAutoCollapse: UIFieldClientComponent = () => {
  const { isCollapsed, toggle } = useCollapsible()
  const modified = useFormModified()
  const markerRef = useRef<HTMLSpanElement>(null)
  const stateRef = useRef({ isCollapsed, toggle, modified })
  const wasModifiedRef = useRef(modified)
  const hasForcedInitialCollapseRef = useRef(false)

  stateRef.current = { isCollapsed, toggle, modified }

  useEffect(() => {
    if (hasForcedInitialCollapseRef.current) return
    hasForcedInitialCollapseRef.current = true
    if (isCollapsed === false) {
      toggle()
    }
    // Only ever run once, right after mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const wasModified = wasModifiedRef.current
    wasModifiedRef.current = modified
    if (wasModified && !modified && stateRef.current.isCollapsed === false) {
      stateRef.current.toggle()
    }
  }, [modified])

  useEffect(() => {
    const wrapper = markerRef.current?.closest<HTMLElement>(WRAPPER_SELECTOR)
    if (!wrapper) return

    const collapseIfIdle = () => {
      const { isCollapsed: collapsed, modified: hasChanges, toggle: flip } = stateRef.current
      if (collapsed || hasChanges) return
      if (wrapper.matches(':hover') || wrapper.contains(document.activeElement)) return
      flip()
    }

    wrapper.addEventListener('mouseleave', collapseIfIdle)
    wrapper.addEventListener('focusout', collapseIfIdle)
    return () => {
      wrapper.removeEventListener('mouseleave', collapseIfIdle)
      wrapper.removeEventListener('focusout', collapseIfIdle)
    }
  }, [])

  return <span ref={markerRef} style={{ display: 'none' }} />
}
```

In both `src/collections/Pages/config.ts` and `src/collections/Posts/
config.ts`, add this as the first field in the "Edit" collapsible's `fields`
array (before `informationTabSave`, before `title`):

```ts
{
  name: 'informationTabEditAutoCollapse',
  type: 'ui',
  admin: {
    components: {
      Field: '@/custom/information-tab-edit-autocollapse/Component.tsx#InformationTabEditAutoCollapse',
    },
  },
},
```

Run `npm run generate:importmap` after adding the component path.

Must not break (in addition to the lists above):
- The Save button from Build step 5 renders and behaves exactly as it did —
  no visual change to the button itself.
- Manually clicking the "Edit" header/chevron must still toggle it — this
  new field only calls the same `toggle()` the header itself calls, it
  doesn't disable or replace the header's own click handling.
- Every `toggle()` call must be guarded by the current `isCollapsed` value,
  never called unconditionally — an unguarded call would spam preference
  writes and could re-open something a user just deliberately closed.
- This field must never call `toggle()` to *open* the accordion — only ever
  to close it. Expanding stays exclusively a manual header click.
- The mount-time force-collapse must run once, not on every render (guarded
  by `hasForcedInitialCollapseRef`), or it would fight a legitimate
  user-driven expand.
- Checking `wrapper.matches(':hover')`/`wrapper.contains(document.
  activeElement)` at the moment of `mouseleave`/`focusout` (rather than
  relying on the event's own target) must correctly keep the accordion open
  when focus merely moves from one field to another *inside* it (e.g. Tab
  from Title to Slug) — only collapse when both hover and focus have
  actually left the whole wrapper.
- The `featured` field's `siblingData`-based validation (step 1's "Must not
  break") is unaffected — this field carries no data (`type: 'ui'`), same as
  `informationTabSave`.

### Follow-up: Nudge effect when trying to leave with unsaved changes

Build step 6's `collapseIfIdle` already has a branch for this: when the mouse
or focus leaves the "Edit" accordion but `modified` is `true`, it silently
does nothing (the accordion stays open, per the original "stays expanded
while there's something to save" requirement). The user wants that moment to
be visible instead of silent — a brief visual effect on the accordion itself
when someone tries to leave it without saving, so it's obvious *why* it
didn't collapse.

Extend `src/custom/information-tab-edit-autocollapse/Component.tsx`: where
`collapseIfIdle` currently does `if (collapsed || hasChanges) return`, split
the `hasChanges` case out and trigger a one-shot CSS animation on the
`.info-tab-edit-collapsible` wrapper (the same ancestor `closest()` already
finds) instead of just returning.

Add to the existing `src/custom/admin-timestamps/styles.css` (already the
project's one stylesheet for Information-tab admin CSS — see steps 2 and 4's
rules there), reusing Payload's own `--theme-warning-500` CSS variable so it
respects light/dark mode automatically, the same way the rest of the admin
UI does:

```css
@keyframes info-tab-edit-collapsible-nudge {
  0%,
  100% {
    box-shadow: none;
  }
  30% {
    box-shadow: 0 0 0 2px var(--theme-warning-500);
  }
}

.info-tab-edit-collapsible--nudge {
  animation: info-tab-edit-collapsible-nudge 500ms ease;
}
```

In the component, retriggering a CSS animation on an element that already
has the class requires removing the class, forcing a reflow, then re-adding
it — simply re-adding the same class name while it's still present does not
restart a running (or just-finished) animation. A single `animationend`
listener, registered once alongside the existing `mouseleave`/`focusout`
listeners in Build step 6's effect, removes the class when the animation
completes, so it's ready to be retriggered on the next attempt:

```ts
const NUDGE_CLASS = 'info-tab-edit-collapsible--nudge'

// Inside the same useEffect that already adds the mouseleave/focusout
// listeners in Build step 6:
const clearNudge = () => wrapper.classList.remove(NUDGE_CLASS)
wrapper.addEventListener('animationend', clearNudge)

const nudge = () => {
  wrapper.classList.remove(NUDGE_CLASS)
  void wrapper.offsetWidth // force a reflow so the animation restarts
  wrapper.classList.add(NUDGE_CLASS)
}

const collapseIfIdle = () => {
  const { isCollapsed: collapsed, modified: hasChanges, toggle: flip } = stateRef.current
  if (collapsed) return
  if (wrapper.matches(':hover') || wrapper.contains(document.activeElement)) return
  if (hasChanges) {
    nudge()
    return
  }
  flip()
}

// ...existing mouseleave/focusout listener wiring, plus remove the
// animationend listener and any lingering nudge class in the cleanup.
```

Must not break (in addition to the lists above):
- The nudge must never fire while the accordion is already collapsed, or
  while the mouse/focus genuinely hasn't left yet (same guards
  `collapseIfIdle` already has).
- The nudge is purely visual — it must not call `toggle()`, must not block
  or delay an actual save, and must not interfere with the "collapse on
  save" transition (Build step 6's `modified` flip-to-`false` effect is
  untouched).
- Rapid repeated attempts to leave (e.g. the mouse leaving and re-entering
  quickly) must restart the animation cleanly rather than leaving the class
  stuck on or the animation visually frozen — confirm the remove-reflow-add
  sequence actually retriggers it empirically per Build step 7's Done when.
- The `animationend` listener must be removed in the effect's cleanup (along
  with the `mouseleave`/`focusout` listeners already cleaned up there), and
  any lingering nudge class removed on unmount, so a fast-navigating editor
  never sees an animation artifact on a field that no longer belongs to the
  current document.

### Build steps

1. [x] Wrap Pages' Information-tab content fields (`title`, `slugField()`,
   `featuredImage`) in one `{ type: 'collapsible', label: 'Edit', admin: {
   initCollapsed: true } }`, leaving the timestamp row outside it. Run `npm
   run generate:types` and confirm `git diff -- src/payload-types.ts` is
   empty (collapsible adds no data shape).
   Done when: opening a Page in `/admin` shows "Last Modified"/"Created"
   immediately, then a collapsed "Edit" section; clicking it reveals Title,
   Slug, Featured Image in that order; collapsing and re-expanding it
   preserves entered values; `npm run build` and `npm run lint` pass with
   no new warnings.
2. [x] Wrap Posts' Information-tab content fields (`title`, `slugField()`,
   `summary`, `featured`, `author`, `category`, `date`, `populatedAuthor`,
   `featuredImage`) in the same `{ type: 'collapsible', label: 'Edit',
   admin: { initCollapsed: true } }` shape, leaving the timestamp row
   outside it. Run `npm run generate:types` and confirm `git diff --
   src/payload-types.ts` is empty.
   Done when: opening a Post in `/admin` shows the timestamp row, then a
   collapsed "Edit" section; clicking it reveals the rest in their existing
   order; the "Make Featured Post" validation (only one featured post
   allowed) still fires correctly when toggled on a second post; `npm run
   build` and `npm run lint` pass with no new warnings.
3. [x] Revise both collapsibles per the user's follow-up: change `label`
   from `'Details'` to `'Edit'` and add `admin: { initCollapsed: true }` in
   both `Pages/config.ts` and `Posts/config.ts`. Run `npm run generate:types`
   (admin-only change, confirm empty diff), `npm run build`, `npm run lint`.
   Done when: both collections' Information tab shows a collapsed "Edit"
   section by default (not expanded), and the label reads "Edit" instead of
   "Details"; `npm run build` and `npm run lint` pass with no new warnings.
4. [x] Bigger "Edit" label font, per a further follow-up. Payload's
   collapsible label renders as `<span class="row-label">` inside
   `.collapsible-field__row-label-wrap` (confirmed in `@payloadcms/ui/dist/
   forms/RowLabel/index.js` and `fields/Collapsible/index.js`) — `.row-label`
   is shared by every array/blocks/collapsible row site-wide, so it can't be
   styled directly. Add `className: 'info-tab-edit-collapsible'` to both
   collapsibles' `admin` block (same pattern as `admin-timestamp-field`
   earlier — `admin.className` lands on the field's own wrapper div, an
   ancestor of `.row-label`), then add one rule to the existing `src/custom/
   admin-timestamps/styles.css`:

   ```css
   .info-tab-edit-collapsible .row-label {
     font-size: 1.25rem;
   }
   ```

   Done when: the "Edit" label text is visibly larger than other row labels
   in the admin (e.g. a Blocks field's block label); `npm run generate:types`
   confirms an empty diff; `npm run build` and `npm run lint` pass with no
   new warnings.
5. [x] Add `src/custom/information-tab-save/Component.tsx` (+ `styles.css`,
   with the `display: flex; justify-content: flex-end` rule) exporting
   `InformationTabSaveButton`, a client component wrapping `@payloadcms/ui`'s
   `SaveButton`. Add one `type: 'ui'` field referencing it to both
   `Pages/config.ts` and `Posts/config.ts`, as the first field inside the
   "Edit" collapsible's `fields` array, before `title`. Run `npm run
   generate:importmap`, then `npm run generate:types` and confirm `git diff
   -- src/payload-types.ts` is empty.
   Done when: opening a Page or Post in `/admin` shows no Save button in the
   Information tab while "Edit" is collapsed; expanding "Edit" reveals a Save
   button right-aligned in the top-right corner, above Title; clicking it
   saves the document the same way the top bar's Save button does (success
   toast, `updatedAt` refreshes, no navigation); the button is disabled until
   a field is modified, matching the top bar button; pressing Cmd/Ctrl+S
   still saves exactly once (no duplicate request, no console error); `npm
   run build` and `npm run lint`
   pass with no new warnings.
6. [x] Add `src/custom/information-tab-edit-autocollapse/Component.tsx` per
   the "Auto-collapse the 'Edit' accordion" follow-up above. Add one
   `type: 'ui'` field referencing `InformationTabEditAutoCollapse` as the
   first field in the "Edit" collapsible's `fields` array (before
   `informationTabSave`) in both `Pages/config.ts` and `Posts/config.ts`. No
   change to `information-tab-save/Component.tsx` or `styles.css` — the Save
   button stays exactly as Build step 5 left it. Run `npm run
   generate:importmap`, then `npm run generate:types` and confirm `git diff
   -- src/payload-types.ts` is empty.
   Done when: reloading a Page or Post whose "Edit" accordion was left
   expanded from a previous session now opens with it collapsed; hovering
   over a collapsed "Edit" header does **not** open it — only clicking it
   does, exactly as steps 1-4 already built; once opened by a click, moving
   the mouse fully away collapses it again as long as nothing is unsaved;
   once opened, Tab-ing out the far side (or Shift+Tab back out the top)
   collapses it, while tabbing *between* fields inside it does not; typing a
   change into Title keeps it expanded even after the mouse leaves and focus
   moves elsewhere; saving with the Save button collapses "Edit" immediately,
   even while the mouse is still over it; the Network tab shows one
   preference write per actual open/close, not
   one per mouse movement; `npm run build` and `npm run lint` pass with no
   new warnings.
7. [x] Extend `src/custom/information-tab-edit-autocollapse/Component.tsx`
   per the "Nudge effect when trying to leave with unsaved changes"
   follow-up above: split the `hasChanges` branch out of `collapseIfIdle`
   into a `nudge()` call, and add the `animationend` listener alongside the
   existing `mouseleave`/`focusout` listeners (same effect, same cleanup).
   Add the `@keyframes info-tab-edit-collapsible-nudge` rule and
   `.info-tab-edit-collapsible--nudge` class to `src/custom/
   admin-timestamps/styles.css`. Run `npm run build` and `npm run lint`.
   Done when: with "Edit" open and a field changed, moving the mouse away
   (or tabbing out) briefly flashes a warning-colored outline around the
   whole "Edit" accordion instead of silently doing nothing, and the
   accordion stays open; leaving again while still unsaved re-triggers the
   flash each time, not just the first; saving (or discarding the change)
   makes the flash stop happening on the next leave attempt, since there's
   nothing left to warn about; the flash never appears when there's nothing
   unsaved (the normal silent auto-collapse from Build step 6 is unchanged);
   `npm run build` and `npm run lint` pass with no new warnings.
8. [x] Retarget the nudge flash per the user's follow-up: the accordion
   itself no longer flashes — only the Save button does, so the effect
   points at the control an editor actually needs to click. Moved the
   `@keyframes`/class from `admin-timestamps/styles.css` to `src/custom/
   information-tab-save/styles.css` (renamed to `information-tab-save-nudge`
   / `.information-tab-save--nudge`, since it now targets that component's
   own wrapper). In `information-tab-edit-autocollapse/Component.tsx`, the
   trigger logic (still watching the whole "Edit" wrapper for genuine
   mouseleave/focusout) is unchanged — only `nudge()`/`clearNudge()` changed,
   now finding `.information-tab-save` inside the wrapper via
   `querySelector` and applying the class there instead of to the wrapper
   itself. Run `npm run build` and `npm run lint`.
   Done when: the same trigger conditions as Build step 7 apply, but the
   warning-colored flash appears as an outline around the Save button, not
   around the whole "Edit" accordion; `npm run build` and `npm run lint`
   pass with no new warnings.
9. [x] Bug fix, found live: typing into Title then just moving the mouse
   away (without also clicking or tabbing elsewhere, so Title kept keyboard
   focus) produced no nudge at all. `collapseIfIdle`'s guard — `if
   (wrapper.matches(':hover') || wrapper.contains(document.activeElement))
   return` — ran *before* checking `hasChanges`, so with focus still inside
   the wrapper it bailed out before ever reaching the nudge branch. Split
   the single `collapseIfIdle` into `attemptToLeave()` (checks `hasChanges`
   first — nudges immediately regardless of whether the other channel,
   hover or focus, still counts as "in use"; only falls through to the
   hover/focus-guarded `flip()` when there's nothing to save) plus separate
   `onMouseLeave`/`onFocusOut` wrappers, with `onFocusOut` keeping its own
   `e.relatedTarget` check (skip entirely when focus is just moving to
   another field inside the accordion, e.g. Title → Slug) before calling
   `attemptToLeave()`. Run `npm run build` and `npm run lint`.
   Done when: typing into Title, then only moving the mouse away (Title
   still focused) flashes the Save button immediately; typing into Title,
   then Tab-ing to Slug (still inside "Edit") does not flash or collapse;
   typing into Title, then Tab-ing out of "Edit" entirely flashes the Save
   button; with nothing unsaved, the same actions still auto-collapse
   exactly as Build step 6 (unaffected by this fix); `npm run build` and
   `npm run lint` pass with no new warnings.
10. [x] Changed the nudge's visual style per the user's follow-up: a
    background-color flash on the Save button itself, not an outline ring
    around it. In `src/custom/information-tab-save/styles.css`, the
    `information-tab-save-nudge` keyframes now animate `background-color`
    (0%/100% back to `var(--bg-color)` — the same CSS variable
    `@payloadcms/ui`'s `Button` styles already use for the button's own
    normal fill, so the flash returns to whatever the button's real color
    is rather than a hardcoded one — 30% to `--theme-warning-500`) instead
    of `box-shadow`, and the animation now targets `.information-tab-save
    --nudge .btn` (the actual button element Payload's `Button` component
    renders) instead of the outer wrapper div. No change to
    `information-tab-edit-autocollapse/Component.tsx` — it still just
    toggles the same `.information-tab-save--nudge` class on the same
    element; only what that class animates changed. Run `npm run build` and
    `npm run lint`.
    Done when: the same trigger conditions as Build steps 7-9 apply, but the
    Save button's own background briefly flashes the warning color instead
    of an outline appearing around it; `npm run build` and `npm run lint`
    pass with no new warnings.
11. [x] Two follow-ups: make the nudge blink 3 times instead of a single
    pulse, and block switching to any other top-level tab while there's
    something unsaved (the user reported that clicking another tab
    currently just navigates there, losing sight of the in-progress edit).

    Blink: in `information-tab-save/styles.css`, changed the keyframes'
    peak from `30%` to `50%` (a cleaner midpoint pulse) and the animation
    from `500ms ease` (one iteration) to `300ms ease-in-out 3` (three
    iterations, ~900ms total). `animationend` still only fires once, after
    all three iterations finish, so `clearNudge()` in `information-tab-
    edit-autocollapse/Component.tsx` needs no change.

    Tab blocking: added a `document`-level `click` listener in the capture
    phase, in the same effect that already owns `nudge()`/the wrapper
    listeners (added/removed alongside them). Payload's tab buttons
    (`.tabs-field__tab-button`, confirmed in `@payloadcms/ui/dist/fields/
    Tabs/Tab/index.js`) are plain `<button type="button" onClick={...}>`
    with no `href` and no React Router navigation — switching tabs is just
    local `activeTabIndex` state in the parent `Tabs` field, which also
    unmounts the previously active tab's fields entirely (confirmed in
    `fields/Tabs/index.js`: `.tabs-field__content-wrap` only ever renders
    `activeTabConfig`'s fields). A capture-phase listener on `document`
    runs before the event can reach the button, so `stopPropagation()`/
    `stopImmediatePropagation()` there reliably keeps React's own `onClick`
    from ever firing — the tab never switches, so this component (and the
    Title/Slug/etc. fields with it) never unmounts. On a blocked click:
    force "Edit" open if it's currently collapsed (an editor can manually
    collapse it via its header even while unsaved), then `nudge()` — same
    flash as leaving it, so blocking a click gives the same feedback as
    trying to leave any other way. Clicking the *already-active* tab
    (`.tabs-field__tab-button--active`) is left alone. Interpreted "tabs or
    other blocks" as the five top-level tabs (Information/Appearance/
    Content/Blog Blocks/SEO) — "Blog Blocks" is one of their literal
    labels — not Payload's `type: 'blocks'` field UI; flag if that's wrong.

    Must not break:
    - Clicking the Information tab itself (already active) must still be a
      harmless no-op, not blocked.
    - This must not interfere with any other document-level click handling
      (Save button, preview link, etc.) — only `.tabs-field__tab-button`
      clicks are intercepted, and only when `modified` is true.
    - The listener must be removed on unmount (component unmounts whenever
      the Information tab itself becomes inactive - which can only happen
      once nothing is `modified`, since this same listener prevents that
      otherwise) to avoid a dangling global listener.

    Run `npm run build` and `npm run lint`.
    Done when: with "Edit" open and a field changed, the flash now blinks
    three distinct times instead of pulsing once; clicking any other tab
    (Appearance, Content, Blog Blocks, SEO) while something is unsaved does
    not navigate there — the Information tab stays active, "Edit" opens if
    it was collapsed, and the Save button blinks; clicking the Information
    tab itself while already active does nothing unusual; saving (or
    discarding) the change, then clicking another tab, navigates normally;
    `npm run build` and `npm run lint` pass with no new warnings.
12. [x] Bug fix, found live: clicking the "Edit" header to open it flickered
    — it visibly started opening, then closed again before finishing,
    needing a second click to actually stay open.

    Root cause: `onFocusOut` checked `e.relatedTarget` synchronously, right
    off the `focusout` event. Clicking the header moves keyboard focus onto
    the header button itself (which is inside the same `.info-tab-edit-
    collapsible` wrapper as everything else — header and content share one
    outer wrapper, per Build step 4). `relatedTarget` timing/support is
    inconsistent enough across browsers that this could read as "focus
    already left" before the browser had actually finished settling focus
    on the header button, making `attemptToLeave()` collapse the accordion
    right back on the same click that had just opened it.

    Fix: `onFocusOut` no longer reads `e.relatedTarget` at all. It defers
    to a `setTimeout(fn, 0)` and re-checks `wrapper.contains(document.
    activeElement)` directly once focus has fully settled, then calls
    `attemptToLeave()` only if focus has genuinely left the wrapper by
    then. The pending timeout is tracked and cleared in the effect's
    cleanup so it can't fire after unmount. `onMouseLeave` is unaffected —
    hover state doesn't have this synchronous-timing problem, since
    `:hover` is already resolved by the browser before the event fires.

    Must not break:
    - Tabbing between fields inside "Edit" (Title → Slug) must still not
      collapse or nudge it — the deferred check still correctly finds
      `document.activeElement` inside `wrapper` in that case.
    - Genuinely leaving via Tab (out the far side) or a real blur to
      outside the wrapper must still work, just ~0ms later than before —
      imperceptible to a user, not a regression.

    Run `npm run build` and `npm run lint`.
    Done when: clicking the collapsed "Edit" header opens it cleanly on the
    first click, every time, with no visible flicker or snap-back; Tab
    between Title and Slug still behaves per Build step 9; Tab or click
    fully out of "Edit" still collapses/nudges correctly per Build steps
    6-9; `npm run build` and `npm run lint` pass with no new warnings.

    **The user reported the flicker was unchanged after this step** — the
    `relatedTarget` timing theory was a real correctness fix (kept), but not
    the actual cause of this specific bug. Diagnostic follow-up confirmed
    other, unrelated collapsible sections in the admin (e.g. the Appearance
    tab's Hero/Breadcrumbs groups) don't flicker — narrowing this to
    something in our own code, not a pre-existing Payload/AnimateHeight
    quirk. See Build step 13.

13. [x] Second attempt at the same flicker. New theory: Build step 6's
    mount-time force-collapse (`if (isCollapsed === false) toggle()`) only
    fires when a stale "expanded" preference is found — which is exactly
    the state a document is in after earlier testing left "Edit" open.
    That `toggle()` drives Payload's own animated collapse (confirmed by
    reading `@payloadcms/ui/dist/elements/AnimateHeight/
    usePatchAnimateHeight.js`: a `ResizeObserver`-based fallback, used by
    browsers without CSS `interpolate-size` support, with its own
    `isAnimating`/`transitionend` bookkeeping tied to a 300ms `duration`).
    Firing that toggle synchronously at mount, then having the user's own
    click land moments later while that internal state hadn't finished
    settling, is a plausible way one animated toggle can corrupt the very
    next one — matching "opens then snaps closed, second click works."

    Fix: the mount-time force-collapse now fires after a 400ms
    `setTimeout` (past `AnimateHeight`'s 300ms duration) instead of
    synchronously in the effect body, with the timeout cleared on unmount.
    This is the same `toggle()` call as before, just delayed enough that
    Payload's own animation machinery has fully settled before it runs, so
    it no longer overlaps with a near-immediate user click. This is a
    best-effort fix pending live confirmation — the exact internal timing
    of a third-party animation library isn't something a build/lint pass
    can verify.

    **Known tradeoff:** on a document where "Edit" was left open from a
    previous session, it will now be visibly open for up to ~400ms after
    the page loads before auto-collapsing, rather than never visibly
    opening at all. Flag if that flash itself is unwanted — the
    alternative is dropping the "defeat a stale preference" behavior from
    Build step 6 entirely, which is a real design tradeoff to make
    explicitly, not silently.

    Run `npm run build` and `npm run lint`.
    Done when: same as Build step 12's Done when, confirmed live by the
    user this time — specifically retested on a document where "Edit" had
    previously been left open (the condition that triggers the mount-time
    toggle in the first place), not only on a document where it was
    already collapsed; `npm run build` and `npm run lint` pass with no new
    warnings.

    **Confirmed fixed live** — no more header-click flicker on first open.

14. [x] Bug fix, found live: with "Edit" open and nothing unsaved, clicking
    a different tab (no changes to trigger Build step 11's block) left
    "Edit" still open when navigating back to the Information tab. The
    existing auto-collapse only reacts to `mouseleave`/`focusout` firing on
    the accordion itself — but switching tabs doesn't guarantee either of
    those fires first (e.g. if the mouse was already resting somewhere
    else and jumps straight to the tab bar without ever crossing back out
    through "Edit"'s own bounds). Since switching tabs unmounts this whole
    component, there was no `mouseleave` to ever collapse it, and once the
    Information tab is remounted later, it just picks up whatever was last
    persisted (still expanded).

    Fix: `onDocumentClickCapture` (from Build step 11) now handles both
    outcomes of a tab-button click, not just the blocked one. When nothing
    is unsaved, it no longer just returns and lets the click through
    silently — it first collapses "Edit" (if currently open) via the same
    `toggle()`, *then* lets the click proceed (no `preventDefault`/
    `stopPropagation`), so the persisted collapsed state is correct by the
    time this component unmounts, regardless of what the mouse/focus
    happened to do on the way there.

    Run `npm run build` and `npm run lint`.
    Done when: with "Edit" open and nothing unsaved, clicking a different
    tab (Appearance, Content, Blog Blocks, SEO) navigates there normally
    (Build step 11's proven case); going back to the Information tab
    afterward shows "Edit" collapsed, not still open; with something
    unsaved, Build step 11's blocking behavior is unaffected; `npm run
    build` and `npm run lint` pass with no new warnings.

    **Confirmed fixed live.**

15. [x] Two related bugs, found live: (a) the Save button itself flashed
    the moment you clicked it to save — the one action that should never
    warn; (b) after that save completed and "Edit" auto-collapsed, opening
    "Edit" back up flashed the Save button again even though nothing was
    unsaved.

    Root cause of (a): `@payloadcms/ui`'s `FormSubmit` disables the button
    while a save request is in flight (`processing` true). A disabled
    control is force-blurred by the browser. That blur fired `onFocusOut`,
    and since the request hadn't resolved yet, `modified` was still `true`
    at that instant - `attemptToLeave()` read it as "trying to leave with
    unsaved changes" and nudged, on the very click that saves them.

    Root cause of (b): the spurious nudge from (a) was still mid-animation
    when "Edit" auto-collapsed moments later (Build step 6, once the save
    *did* resolve and flipped `modified` to `false`). Collapsing makes the
    button `display: none` once the close animation finishes - which
    cancels any still-running CSS animation outright. A canceled animation
    never fires `animationend`, so `clearNudge()` (which only listened for
    that event) never ran, leaving the `--nudge` class stuck on the button.
    A CSS animation restarts on its own once a `display: none` element
    holding the class becomes visible again - so it silently replayed the
    next time "Edit" was reopened.

    Fix for (a): added `useFormProcessing()` to the state this component
    already tracks. `attemptToLeave()` now returns immediately whenever a
    save is in flight - no nudge, no collapse - since the save resolving
    flips `modified` to `false` a moment later, which already triggers the
    correct auto-collapse on its own.

    Fix for (b), defensive rather than relying solely on `animationend`:
    every place this component programmatically collapses "Edit" (the
    post-save collapse in the `modified`-tracking effect, the "leaving
    while idle" `flip()` in `attemptToLeave`, and the "switched tabs with
    nothing unsaved" branch in `onDocumentClickCapture`) now also directly
    removes the `--nudge` class from the Save button at that same moment,
    rather than trusting only the animation to finish cleanly on its own.

    Must not break:
    - A save that's actually still in flight must not be interrupted or
      delayed by any of this - `attemptToLeave` returning early while
      `processing` is `true` doesn't touch `toggle()` or `submit()`.
    - The nudge must still fire normally for every other "trying to leave
      with unsaved changes" case (Build steps 7-10) - the `processing`
      guard only suppresses it during an active save request, not
      generally.

    Run `npm run build` and `npm run lint`.
    Done when: clicking the Save button after making a change no longer
    flashes it - only the top bar's usual save toast/behavior happens;
    "Edit" still auto-collapses once the save completes, exactly as before;
    reopening "Edit" afterward shows a plain Save button, not a flash;
    every other nudge trigger from Build steps 7-10 still works normally;
    `npm run build` and `npm run lint` pass with no new warnings.

### Reverted

A fifth step added a Save button copy inside the "Edit" collapsible's
header (a custom `admin.components.Label` rendering `<SaveButton />`
alongside the label text). The user reported something went wrong and
asked to revert it. Fully undone: deleted `src/custom/
edit-collapsible-label/` (both files), removed the `components: { Label:
... }` block from both collections' collapsible `admin` config (keeping
`initCollapsed`/`className` from steps 3-4), regenerated the import map
(confirmed 0 remaining references) and types (confirmed empty diff), and
reran `npm run build`/`npm run lint` clean. The collapsible is back to
exactly step 4's state: labeled "Edit", collapsed by default, bigger label
font, no embedded Save button.

### Verify

`npm run dev`, then in `/admin`:

- Open an existing Page: Information tab shows Last Modified/Created first,
  then a collapsed "Edit" section (not expanded). Click "Edit" to reveal
  Title, Slug, Featured Image with their saved values. The "Edit" label
  text is noticeably larger than a normal row label.
- Open any Blocks or Array field elsewhere in the admin (e.g. Pages'
  Content tab): its row labels are unaffected — confirms the bigger font
  is scoped to just this collapsible, not `.row-label` globally.
- Collapse "Edit" again, save the page: nothing changes (fields keep their
  values; collapse state is a UI preference, not data).
- Open an existing Post: same layout — timestamps first, then a collapsed
  "Edit" section; expanding it shows Title, Slug, Summary, Make Featured
  Post, Author, Category, Date, Featured Image, in that order.
- On a Post, toggle "Make Featured Post" on when another post already has
  it on: still shows the "Only one featured post is allowed" validation
  error (confirms `siblingData.slug` still resolves correctly from inside
  the collapsible).
- Create a new Page and a new Post: Slug still auto-generates from Title
  inside the collapsible.
- Open the Appearance/Content/Blog Blocks/SEO tabs on both collections:
  unchanged.
- No Save button appears inside the "Edit" header — confirms the reverted
  step left no trace.
- With "Edit" collapsed, confirm no Save button is visible in the
  Information tab.
- Expand "Edit": a Save button sits right-aligned in the top-right corner,
  above Title. Change the Title and click it: the document saves, a success
  toast appears, and "Last Modified" updates — without needing the top bar's
  Save button.
- Repeat on a Post.
- Before making any change, the new Save button is disabled, matching the
  top bar's Save button.
- Press Cmd/Ctrl+S after making a change: the document saves once, with no
  duplicate request or console error.
- Expand "Edit" by hand, then reload the page: "Edit" opens collapsed again
  regardless of the state it was left in — confirms the stale-preference
  override.
- Hover over a collapsed "Edit" header without clicking: it stays collapsed
  — hovering never expands it.
- Click the "Edit" header: it expands cleanly on the first click, with no
  flicker or snapping back closed (the bug Build step 12 fixed). Move the
  mouse fully away without changing anything: it collapses again.
- Repeat clicking "Edit" open and closed several times in a row: it opens
  smoothly on the first click every time, not just occasionally.
- Click "Edit" open again, move the mouse onto one of its fields (e.g. the
  Title input) without leaving the accordion's bounds: it stays expanded.
- Click "Edit" open, then Tab (keyboard) out of it entirely without hovering
  it: it collapses (once nothing is unsaved). Reopen it, Tab between its own
  fields (Title → Slug) instead: it stays expanded throughout.
- Click "Edit" open, change the Title, then move the mouse away and let
  focus leave: "Edit" stays expanded because there's something unsaved.
- With "Edit" open, the Title still changed, and the mouse hovering inside
  it, click the Save button: the document saves and "Edit" collapses
  immediately, even though the mouse hasn't moved off it.
- Click "Edit" open again afterward: it opens normally, confirming the
  forced post-save collapse doesn't get stuck.
- With the browser dev tools Network tab open, click "Edit" open, then hover
  in and out of it repeatedly without changing anything: at most one
  `payload-preferences` request for the open, and none from the repeated
  hovering.
- Click "Edit" open, type into Title, then move the mouse away *without*
  clicking or tabbing anywhere else (Title keeps keyboard focus the whole
  time): the Save button still flashes immediately — this is the scenario
  Build step 9 fixed; it must not require also losing focus.
- Repeat leaving it (mouse back in, then away again) while the Title is
  still unsaved: the flash happens again each time, not just once.
- Save the change (or reload without saving to discard it), then leave
  "Edit" again: no flash — either it collapses silently (nothing unsaved) or
  it's already collapsed from the save.
- Type into Title, then Tab to Slug (still inside "Edit"): no flash and no
  collapse — moving focus between fields inside the accordion isn't
  "leaving."
- Type into Title, then Tab all the way out of "Edit" (not using the mouse
  at all): the Save button flashes.
- Trigger any of the above nudges and count: the Save button blinks three
  distinct times (on-off-on-off-on-off), not one long pulse.
- Change the Title, then click the "Appearance" tab: nothing happens — the
  Information tab stays active, and the Save button blinks. Try "Content",
  "Blog Blocks", and "SEO" too: same result for each.
- With "Edit" manually collapsed (click its header to close it) while the
  Title is still unsaved, click another tab: "Edit" pops back open and the
  Save button blinks, instead of the flash being invisible inside a
  collapsed section.
- Click the "Information" tab itself while it's already active and
  something is unsaved: nothing unusual happens (no blink, no error).
- Save the change (or discard it by reloading), then click "Appearance":
  it navigates normally this time.
- Click "Edit" open, make no changes, then click "Appearance": navigates
  there immediately, same as before. Click back to "Information": "Edit" is
  collapsed, not still open.
- Repeat, but move the mouse to hover inside "Edit" first, then click
  "Appearance" without changing anything: same result — collapsed on
  return, not just when the mouse never entered it.
- Click "Edit" open, change the Title, then click the Save button: it does
  not flash — the click that saves the change is not treated as trying to
  leave. "Edit" still auto-collapses once the save completes.
- Click "Edit" open again right after that save: the Save button shows
  plain, no flash — confirms the nudge from a previous save attempt doesn't
  linger and replay on reopen.
- Change the Title again, leave "Edit" without saving (so it nudges per
  Build step 7), then actually click Save: the earlier nudge doesn't
  continue animating or get stuck — it stops cleanly once the save
  auto-collapses "Edit".
