# Current Feature

**Title:** Move Created / Last Modified into the Information tab (Pages & Posts)
**Type:** Fix
**Status:** verified
**Branch:** `fix/move-created-last-modified-into-information-tab`

### The problem

The "Last Modified: ..." and "Created: ..." text (e.g. `September 14th
2026, 7:50 PM` / `September 7th 2026, 11:24 AM`) currently only appears in
Payload's sticky **doc-controls bar** at the top of every document's edit
screen. That display is hardcoded UI inside `@payloadcms/ui`'s
`DocumentControls` component (`node_modules/@payloadcms/ui/dist/elements/
DocumentControls/index.js`) — it reads `data.updatedAt`/`data.createdAt`
directly and is not driven by the `fields` config at all, so it can't be
repositioned by editing a collection's field list alone. The user wants this
information to live inside the **Information** tab instead, for the `Pages`
and `Posts` collections specifically (both already have an Information tab —
`src/collections/Pages/config.ts`, `src/collections/Posts/config.ts`).

Key fact confirmed in `payload`'s source
(`node_modules/payload/dist/collections/config/sanitize.js`): every
collection with `timestamps !== false` (the default) gets `updatedAt`/
`createdAt` fields auto-injected as hidden `type: 'date'` fields *only when
not already declared* in `fields`. Declaring them explicitly ourselves is the
supported way to control where they render — Payload keeps auto-populating
their values on every save exactly as before; only the admin-UI placement
and label change.

### The fix

Two independent pieces, both required (adding the fields alone would
duplicate the display, not move it):

1. **Add real `updatedAt`/`createdAt` fields to each collection's
   Information tab** (Pages and Posts), so Payload's own `DateField`
   displays them there using the site's existing admin date format
   (`'MMMM do yyyy, h:mm a'`, Payload's default — already produces exactly
   the `September 14th 2026, 7:50 PM` style in the report). Add this as the
   first field in each Information tab's `fields` array:

   ```ts
   {
     type: 'row',
     fields: [
       {
         name: 'updatedAt',
         type: 'date',
         label: 'Last Modified',
         index: true,
         admin: {
           readOnly: true,
           disableBulkEdit: true,
           className: 'admin-timestamp-field',
           date: { pickerAppearance: 'dayAndTime' },
         },
       },
       {
         name: 'createdAt',
         type: 'date',
         label: 'Created',
         index: true,
         admin: {
           readOnly: true,
           disableBulkEdit: true,
           className: 'admin-timestamp-field',
           date: { pickerAppearance: 'dayAndTime' },
         },
       },
     ],
   },
   ```

   `admin.className` gives both fields a shared, stable CSS hook (used by
   piece 3 below) without affecting any other date field in the admin panel.

   `readOnly` prevents an editor from hand-editing a system-managed
   timestamp. `index: true` and `disableBulkEdit: true` match Payload's own
   auto-injected defaults for these fields (preserves the existing DB index
   used for the list view's default sort; keeps them out of the bulk-edit-many
   UI) — nothing about the underlying schema/index changes, only that we're
   now declaring explicitly what Payload declared implicitly before.

2. **Hide the now-duplicate doc-controls display, scoped to just these two
   collections.** Payload's Edit view root already carries a
   `collection-edit--<slug>` class per collection
   (`node_modules/@payloadcms/ui/dist/views/Edit/index.js`), and the two
   `<li>` elements we need to hide are the only ones with the
   `doc-controls__value-wrap` class (Save/Publish/Status/Autosave use a
   different class) — so this is precise without touching any other
   collection, global, or the doc-controls buttons:

   ```css
   .collection-edit--pages .doc-controls__value-wrap,
   .collection-edit--posts .doc-controls__value-wrap {
     display: none;
   }
   ```

   New files: `src/custom/admin-timestamps/styles.css` (the rule above,
   with an explanatory comment) and `src/custom/admin-timestamps/
   Component.tsx` exporting a no-markup provider component that imports the
   CSS:

   ```tsx
   import type React from 'react'
   import './styles.css'

   export function AdminTimestampStyles({ children }: { children: React.ReactNode }) {
     return children
   }
   ```

   Register it in `src/payload.config.ts`'s existing `admin.components`
   block, alongside `graphics`: `providers: ['@/custom/admin-timestamps/
   Component.tsx#AdminTimestampStyles']` — `admin.components.providers` is
   Payload's documented mount point for admin-wide styling/behavior that
   isn't scoped to one existing custom component (confirmed against
   `@payloadcms/next`'s `NestProviders`, which passes each provider a
   `children` prop to render).

3. **Suppress the DatePicker's clear ("X") button on these two fields.**
   Confirmed in `node_modules/@payloadcms/ui/dist/elements/DatePicker/
   DatePicker.js`: the clear button renders whenever a date field has a
   value, with no check on `readOnly`/`disabled` at all — only the actual
   date-picking input respects `readOnly`. Left alone, a system-managed,
   supposedly read-only timestamp would still show a clickable button whose
   `onClick` calls `onChange(null)`. Add one more rule to the same
   `src/custom/admin-timestamps/styles.css`, scoped to the `admin-timestamp-field`
   class from piece 1 (not every date field site-wide):

   ```css
   .admin-timestamp-field .date-time-picker__clear-button {
     display: none;
   }
   ```

Must not break:
- The doc-controls bar's Save/Publish/Status/Autosave controls, and its
  Last Modified/Created display on every other collection and global
  (Media, Users, Categories, Header, Footer, Settings) — untouched, only
  `.collection-edit--pages`/`--posts` are targeted.
- The actual `createdAt`/`updatedAt` values and their DB index — Payload
  still auto-populates them on every create/update at the database-adapter
  level regardless of how the field is declared in `fields`; this fix only
  changes where and how they're displayed in the admin UI.
- The existing Information tab fields and their order for both collections.
- Any other date field's clear button — `.admin-timestamp-field` is applied
  only to `updatedAt`/`createdAt` on Pages and Posts.

### Build steps

1. [x] Add `src/custom/admin-timestamps/styles.css` and `src/custom/
   admin-timestamps/Component.tsx`, register the provider in `src/
   payload.config.ts`, then run `npm run generate:importmap` (required
   after adding a custom component, per `AGENTS.md`).
   Done when: `npm run build` passes and the import map includes the new
   component with no errors.
2. [x] Add the `updatedAt`/`createdAt` row (exact snippet above) as the
   first field of the Information tab's `fields` array in both `src/collections/
   Pages/config.ts` and `src/collections/Posts/config.ts`, then run `npm
   run generate:types` (field config changed).
   Done when: opening an existing Page or Post in `/admin` shows "Last
   Modified" and "Created" as read-only date fields at the top of the
   Information tab, formatted the same way they were in the doc-controls
   bar; the doc-controls bar itself no longer shows them for these two
   collections (Save/Publish/Status still visible there); every other
   collection/global still shows Last Modified/Created in its doc-controls
   bar exactly as before. `npm run build` and `npm run lint` pass with no
   new warnings.
3. [x] Add the `.admin-timestamp-field .date-time-picker__clear-button`
   rule to `src/custom/admin-timestamps/styles.css` and the
   `admin.className: 'admin-timestamp-field'` line to both fields in both
   collection configs, then run `npm run generate:types` (admin config
   change only, but keeps the type snapshot in sync with source).
   Done when: the "Last Modified"/"Created" fields no longer show a clear
   ("X") button; every other date field in the admin (e.g. Posts' own
   `date` field) still shows its clear button exactly as before. `npm run
   build` and `npm run lint` pass with no new warnings.

### Verify

`npm run dev`, then in `/admin`:

- Open an existing Page: Information tab shows "Last Modified" and
  "Created" as two read-only date fields at the top, values matching
  what the doc-controls bar used to show. The doc-controls bar at the top no
  longer shows them (Save/Publish/Status buttons still there).
- Same check for an existing Post.
- Create a brand-new Page (or Post), save it: "Created" and "Last Modified"
  populate correctly and match each other on first save; editing and saving
  again updates "Last Modified" only.
- Try editing the "Last Modified"/"Created" inputs directly in the
  Information tab: they're read-only (not editable), and neither one shows
  a clear ("X") button next to its value.
- Check Posts' own `date` field (unrelated to this fix): still shows its
  normal clear button when it has a value — confirms the suppression is
  scoped to just the two timestamp fields.
- Open a Media, User, Category, Header, Footer, or Settings document: the
  doc-controls bar still shows Last Modified/Created exactly as before this
  fix (unaffected collections/globals).

## Addendum - Move the Posts slug field into the Information tab

### The problem

`src/collections/Posts/config.ts` called `slugField()` with no options at
the top level of `fields` (outside the tabs), which defaults to
`admin.position: 'sidebar'` (`node_modules/payload/dist/fields/baseFields/
slug/index.js`). That put Slug in the edit view's sidebar, separate from
the rest of the post's basic info in the `Information` tab. `Pages` already
solves this the same way (see `blueprint/history/fixes/
pages-slug-information-tab.md`), which deliberately left `Posts` untouched
at the time — the user now wants the same treatment for `Posts`.

### The fix

Same pattern as the Pages precedent: remove the top-level `slugField()`
call and add it inside the `Information` tab's `fields` array, directly
under `title` (`slugField()`'s only supported way to move off its hardcoded
`'sidebar'` default is its `overrides` hook, since `position` itself only
accepts `'sidebar'` per Payload's own type):

```ts
slugField({
  overrides: (field) => {
    field.admin = {}
    return field
  },
}),
```

Must not break: slug auto-generation from `title` on create (the
`generateSlug` checkbox + hook logic is untouched, only the row's visual
position changes), the field's `unique`/`index` behavior, already-saved
post slugs, and `revalidatePost`'s hooks that key off `slug`. `Pages` and
`Categories` are unaffected (Pages already matches this layout; Categories
was not requested and keeps its sidebar placement).

### Build steps

4. [x] In `src/collections/Posts/config.ts`, remove the top-level
   `slugField()` call and add it inside the `Information` tab's `fields`
   array, directly after `title`, using the same `overrides` callback as
   Pages. Run `npm run generate:types` (field position changed).
   Done when: opening a Post in the admin shows Title then Slug (with its
   "Generate slug" toggle) inline in the Information tab, right above
   Summary; the sidebar no longer shows a Slug field for Posts; creating a
   new post still auto-fills the slug from the title; Pages and Categories
   admin screens are unchanged. `npm run build` and `npm run lint` pass
   with no new warnings.

### Verify (addendum)

- Open an existing Post: Slug now appears inline in the Information tab
  (under Title, above Summary) with its saved value, not in the sidebar.
- Create a new Post, type a Title: Slug auto-generates inline in the
  Information tab.
- Open a Page and a Category: Slug still appears exactly as before (Pages:
  inline in its own Information tab; Categories: sidebar).
