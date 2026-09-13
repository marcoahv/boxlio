# Current Feature

**Title:** Rename the blog post's "Header section" to "Hero section"
**Type:** Fix
**Status:** verified
**Branch:** `fix/post-hero-section-label`

## The problem

In the Posts collection's Appearance tab, the group that controls the post's
title, meta row, and banner image is admin-labeled "Header section"
(`src/collections/Posts/config.ts:148`):

```ts
{
  type: 'group',
  name: 'headerAppearance',
  label: 'Header section',
  admin: {
    description: 'The title, meta row, and banner image at the top of the post.',
  },
  fields: appearanceField(),
},
```

The user wants editors to see this called "Hero section" instead.

Heads up: the project already has a separate, unrelated **Hero** page-builder
block (`src/blocks/Hero/config.ts`, labeled "Hero" / "Heroes") used in Pages'
Layout tab. After this rename, "Hero section" (post appearance group) and
"Hero" (block) are two different things that share a name. Flagged in case it
wasn't intended - proceeded with the rename as asked since it's an
admin-label-only change, not a new concept.

## The fix

Change only the visible `label` from `'Header section'` to `'Hero section'`.
Keep the underlying group `name: 'headerAppearance'` unchanged: it's the
Mongo-persisted field key for every already-saved post (surface/spacing/etc.
live under `data.headerAppearance` - see `PostClient.tsx:43-44` and the
generated `Post['headerAppearance']` type). Renaming the field itself would
silently orphan that saved data with no migration step in this project's
Mongo setup, for a request that only asked for a label change.

Must not break: `PostClient.tsx`'s live-preview reads of
`data.headerAppearance?.surface`/`.width`, the generated
`src/payload-types.ts` shape, and every already-saved post's appearance
settings.

## Build steps

- [x] 1. In `src/collections/Posts/config.ts`, change the `headerAppearance`
  group's `label` from `'Header section'` to `'Hero section'`.
  - Done when: opening a Post in the admin's Appearance tab shows "Hero
    section" where "Header section" used to be, the group still holds the
    same surface/spacing/width controls, and an existing post's saved
    appearance values still load correctly under that group.

## Verify

- `npm run build` passes (Posts config still type-checks; no data-shape
  change expected in `payload-types.ts`).
- In the admin, open an existing Post's Appearance tab: the group is now
  titled "Hero section", its current surface/spacing/width values are intact.
- Confirm the post's live preview / rendered header still reflects those
  values unchanged.
