# Current Feature

**Title:** Rename Settings as Site Settings
**Type:** Fix
**Status:** verified
**Branch:** `fix/rename-settings-as-site-settings`

## The problem

The `Settings` global (`src/globals/Settings/config.ts`) has no `label`, so
Payload derives its admin nav label by title-casing the slug (`settings`) to
"Settings". That's ambiguous next to other admin nav items and doesn't
communicate that it holds site-wide options (site name, icon, corner radius,
GTM code, etc.).

## The fix

Add an explicit `label: 'Site Settings'` to the global config. This is a
display-only change:

- Keep `slug: 'settings'` as-is — the slug backs the Mongo collection name,
  the REST/GraphQL path (`/api/globals/settings`), and the
  `livePreview.globals` entry in `payload.config.ts`. Changing it would need
  a data migration and isn't part of this fix.
- Only the admin nav label and the global's edit-view heading change.

Must not break: the `settings` slug references in `payload.config.ts`
(`livePreview.globals`, the `globals: [Header, Settings, Footer]` array) and
any Local API calls using `collection`/`global: 'settings'` — none of those
change because they key off the slug, not the label.

## Build steps

- [x] 1. In `src/globals/Settings/config.ts`, add `label: 'Site Settings'`
  next to `slug: 'settings'`.
  **Done when:** the admin sidebar and the global's edit page both show
  "Site Settings" instead of "Settings", and the global still loads/saves
  correctly at `/admin/globals/settings`.

## Verify

- Run `npm run dev`, open `/admin`, confirm the nav item reads "Site
  Settings" and its edit page heading matches.
- Save a change on the global (e.g. toggle a corner radius) and confirm it
  persists — proves the slug-based read/write path is untouched.
