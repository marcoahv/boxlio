# Current Feature

**Title:** Move the Pages slug field into the Information tab
**Type:** Fix
**Status:** verified
**Branch:** `fix/pages-slug-information-tab`

## The problem

`src/collections/Pages/config.ts:32` calls `slugField()` with no options, which
defaults to `admin.position: 'sidebar'` (see
`node_modules/payload/dist/fields/baseFields/slug/index.js`). That renders the
Slug field (and its hidden "Generate slug" checkbox) in the edit view's
sidebar, separate from the rest of the page's basic info, which lives in the
first tab (`Information`: `title`, `featuredImage`).

## The fix

Move the slug field out of the sidebar and into the `Information` tab, placed
right after `title` and before `featuredImage` (title, then its derived slug,
then the image). `slugField()`'s only supported way to change its own
`admin.position` away from the hardcoded `'sidebar'` default is its
`overrides` hook (its `position` option only accepts `'sidebar'` per Payload's
own type), so clear the row field's `admin` in an `overrides` callback:

```ts
slugField({
  overrides: (field) => {
    field.admin = {}
    return field
  },
}),
```

Scope is Pages only, per the request. `Posts` and `Categories`
(`src/collections/Posts/config.ts`, `src/collections/Categories/config.ts`)
call `slugField()` the same default way and keep their sidebar placement
untouched.

Must not break: slug auto-generation from `title` on create (the
`generateSlug` checkbox + hook logic is untouched, only the row's visual
position changes), the field's `unique`/`index` behavior, already-saved page
slugs, and `revalidatePage`'s hooks that key off `slug`.

## Build steps

- [x] 1. In `src/collections/Pages/config.ts`, remove the top-level
  `slugField()` call (line 32) and add it inside the `Information` tab's
  `fields` array, between `title` and `featuredImage`, using the `overrides`
  callback above to drop its sidebar position.
  - Done when: opening a Page in the admin shows Title, then Slug (with its
    "Generate slug" toggle), then Featured Image, all inline inside the
    Information tab; the sidebar no longer shows a Slug field; creating a new
    page still auto-fills the slug from the title; and Posts/Categories admin
    screens are unchanged.

## Verify

- `npm run build` passes (Pages config still type-checks).
- In the admin, open an existing Page: Slug now appears inline in the
  Information tab with its saved value, not in the sidebar.
- Create a new Page, type a Title: Slug auto-generates inline in the
  Information tab.
- Open a Post and a Category: Slug still appears in the sidebar as before.
