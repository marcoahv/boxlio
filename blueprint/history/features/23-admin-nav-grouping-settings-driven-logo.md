# Current Feature

**Title:** Admin nav grouping & Settings-driven logo
**Type:** Feature (build-plan item 23)
**Status:** verified
**Branch:** `feature/admin-nav-grouping-settings-driven-logo`

## Goal

Group the Payload admin sidebar into meaningful sections instead of the flat
default "Collections"/"Globals" split, and replace Payload's own wordmark/icon
on the login page and nav with the site's own uploaded branding, so a cloned
site's admin panel looks and feels like it belongs to that site without a
separate admin-only asset upload.

**Revised in-place (before `/complete`):** the login-page graphic
(`AdminLogo`) uses the site's actual **Logo** image (`Header.logo`), not the
small favicon-style **Site Icon** (`Settings.icon`) - the user's explicit
request after seeing the initial build, since a login page reads better with
the real wordmark/logo than a square icon mark.

**Revised in-place again (before `/complete`):** the nav sidebar graphic
(`AdminIcon`) also switched from `Settings.icon` to `Header.logo` - a second
explicit user request, so both admin-branding slots briefly shared one
source of truth.

**Revised in-place a third time (before `/complete`):** the nav icon's
rendered size is enlarged from Payload's default (a third explicit user
request - "is there a way to make it bigger", clarified to mean the nav icon
specifically, at the largest of three offered sizes). Traced the actual
render path in `@payloadcms/ui`'s compiled source (not guessed): `AdminIcon`
renders inside `AppHeader` -> `StepNav` -> a `.step-nav__home` container fixed
at `18px` x `18px` (`16px` at `max-width: 1024px`, Payload's own `mid-break`).
`AdminLogo`'s login-page container was not touched - only the size question
above was about the nav icon.

**Revised in-place a fourth time (before `/complete`):** `AdminIcon` switched
back to `Settings.icon` - a fourth explicit user request ("put back the icon
instead"), reverting the second revision above for the nav slot only.
`AdminLogo` (login page) stays on `Header.logo`, and the `40px` size override
from the third revision is unaffected - the user asked to restore the
*source*, not the *size*. Final state: `AdminIcon` = `Settings.icon` at
`40px`, `AdminLogo` = `Header.logo`, matching the build-plan item's original
"Settings.icon" wording for the nav icon specifically, while the login logo
stays on the richer `Header.logo` source from the first revision.

## In scope

- **Admin nav grouping**, via each collection/global's `admin.group` string
  (confirmed in `@payloadcms/ui`'s `groupNavItems` - a collection and a global
  sharing the same `group` string merge into one combined sidebar section,
  keyed purely by that string):
  - **"Content"**: `Pages`, `Posts`, `Categories`, `Media` (collections).
  - **"Site Identity"**: `Header`, `Settings`, `Footer` (globals) - named
    "Site Identity" rather than reusing `Settings`' own admin label "Site
    Settings", to avoid a group literally containing an item of the same
    name; matches the build-plan item's own "site-identity" wording.
  - `Users` stays **ungrouped**, landing in Payload's default "Collections"
    bucket. That default bucket occupies a fixed first slot in Payload's own
    grouping output regardless of array order (confirmed by reading
    `groupNavItems.js`), so it will render above "Content"/"Site Identity" in
    the sidebar, containing only "Users" - an accepted, deliberate cosmetic
    consequence of leaving it ungrouped, not a bug.
  - Reorder `payload.config.ts`'s `collections: [...]` array from
    `[Users, Media, Pages, Posts, Categories]` to
    `[Users, Pages, Posts, Categories, Media]` - display-order only (Payload
    groups items in array-encounter order), zero functional effect, so
    "Content" reads Pages/Posts/Categories/Media rather than Media-first.
- **Icon- and Logo-driven admin branding**, via Payload's
  `admin.components.graphics.Icon`/`Logo` config (confirmed via
  `payload`'s own type definitions: `Icon` replaces the nav icon, `Logo`
  replaces the login-page logo; both are Server Components that receive
  `payload` as a prop):
  - One new file, `src/custom/admin-branding/Component.tsx`, exporting
    `AdminIcon` (sourced from `Settings.icon`) and `AdminLogo` (sourced from
    `Header.logo`) - two independent sources, each the final result of an
    explicit user choice for that specific slot.
  - `getSettingsIconSafely()` fetches `getCachedGlobal('settings', 1)()` and
    `getHeaderLogoSafely()` fetches `getCachedGlobal('header', 1)()` (the
    exact same already-shipped utility `layout.tsx` uses for globals, so a
    new upload invalidates via the existing `revalidateGlobal` hook with no
    new cache-tag wiring), each inside its own `try`/`catch`, each returning
    the populated `Media` doc only when `isDoc<Media>(...)` is true and
    `.url` is present - otherwise `null`. Both `Settings.icon` and
    `Header.logo` are `required: true` (confirmed in their respective
    config files), so each only returns `null` on a genuine fetch failure,
    not in normal operation.
  - `AdminIcon` calls `getSettingsIconSafely()`; `AdminLogo` calls
    `getHeaderLogoSafely()`. When the call resolves a `Media` doc, each
    renders an `<img>` from it; when it resolves `null`, each falls back to
    its own Payload default graphic.
  - Both `<img>`s carry the **same** `graphic-icon`/`graphic-logo` className
    Payload's own default components use (confirmed in `@payloadcms/ui`'s
    `graphics/Icon`/`graphics/Logo` source) plus `style={{ width: '100%',
    height: '100%', objectFit: 'contain' }}`, so each inherits whatever
    container sizing Payload's admin CSS already applies to that slot instead
    of guessing pixel values.
  - On a fetch failure, or an unpopulated/missing image, each falls back to
    rendering Payload's own `PayloadIcon`/`PayloadLogo` (imported from
    `'@payloadcms/ui/shared'`) - a cosmetic branding read must never be able
    to block `/admin/login` or the dashboard nav from rendering.
  - `AdminIcon` uses `alt=""` (decorative - it sits beside the nav's own
    labeled dashboard link). `AdminLogo` uses `header.logo.alt` directly (the
    Media doc's own `required: true` alt text) - the login page's primary
    visual identity, with no surrounding accessible name, so it needs a real
    accessible name rather than an empty one; the uploaded image's own alt
    field is the correct, already-enforced source for that, the same field
    every other Media consumer in this codebase relies on.
  - Wire both in `payload.config.ts`'s `admin.components.graphics`.
  - Run `npm run generate:importmap`.
- **Nav icon sizing override**, in `src/app/(payload)/custom.scss` (the
  project's existing, already-imported admin-CSS override file - unlayered,
  so it beats Payload's own `@layer payload-default` rules with no
  `!important` needed, confirmed by that file's own top comment): a
  `.step-nav__home { width: 40px; height: 40px; }` rule, replacing Payload's
  default `18px`/`16px` (mid-break) sizing for the container `AdminIcon`
  renders into. One unconditional rule (no media query) overrides both of
  Payload's layered variants at every viewport width, per how CSS cascade
  layers resolve.
## Out of scope

- **The admin panel's own browser-tab favicon** (`admin.meta`/
  `generatePageMetadata` in the auto-generated
  `src/app/(payload)/admin/[[...segments]]/page.tsx`) - a separate mechanism
  from `graphics.Icon`/`Logo`, not touched.
- **`Settings.iconDark`/`Header.logoDark`** - the admin panel has its own
  light/dark theme system, independent of the frontend's `data-theme`
  mechanism this project built for the public site. `AdminIcon`/`AdminLogo`
  each use only the light variant of their respective field. Not wired here.
- **Role-based access control** (build-plan item 24) - restricting who sees
  which nav group is a separate, later feature; every existing collection/
  global keeps its current access rules untouched.
- **Renaming or re-slugging any collection/global** - only a new `admin.group`
  key is added to each; existing `slug`/`label` values are untouched
  (`Settings`' own "Site Settings" label stays as-is).
- **`AdminLogo`'s login-page container size** - the explicit follow-up
  request to enlarge was scoped to the nav icon only; the login page's own
  logo container is untouched. If it also needs resizing later, that's a new
  request, following the same trace-then-override approach used here.
- **Admin-side unit tests** - matches the project's existing precedent for
  admin-configuration/rendering code (e.g. `Logo.tsx`, `ColorPickerField`
  have none); verified manually via `/try` instead.

## Build loop

Per `blueprint/config.json` (`workflow.stepReview: "feature"`,
`checkpointCommits: "disabled"`): implement and verify each step below in
order without pausing for approval between them, keeping the project working
after every step, then stop and present one review packet with the complete
diff and each step's Done-when evidence before `/complete`. No checkpoint
commits.

## Build steps

- [x] 1. **Group the admin nav.** Add `group: 'Content'` to the existing
  top-level `admin` block in `src/collections/Pages/config.ts`,
  `src/collections/Posts/config.ts`, and `src/collections/Categories/config.ts`
  (each already has an `admin: {...}` object - add the key alongside what's
  there, e.g. next to `useAsTitle`). Add a brand-new top-level
  `admin: { group: 'Content' }` block to `src/collections/Media/config.ts`
  (it currently has none). Add a brand-new top-level
  `admin: { group: 'Site Identity' }` block to `src/globals/Header/config.ts`,
  `src/globals/Settings/config.ts`, and `src/globals/Footer/config.ts` (none
  currently have one). In `src/payload.config.ts`, reorder the `collections`
  array to `[Users, Pages, Posts, Categories, Media]`. **Done when:** `npm run
  build` passes; in `/admin`, the sidebar shows a "Content" group (Pages,
  Posts, Categories, Media, in that order), a "Site Identity" group (Header,
  Site Settings, Footer, in that order), and "Users" still reachable under
  the default "Collections" heading.

- [x] 2. **Build the branded Icon/Logo components.** Create
  `src/custom/admin-branding/Component.tsx` exporting `AdminIcon` (reads
  `Settings.icon`) and `AdminLogo` (reads `Header.logo`) as described in In
  scope (async Server Components, `try`/`catch` around each's own
  `getCachedGlobal(...)()` call, `isDoc<Media>` guard, `graphic-icon`/
  `graphic-logo` className + container-fill inline style, fallback to
  `PayloadIcon`/`PayloadLogo` from `'@payloadcms/ui/shared'`). **Done when:**
  `npm run build` and `npm run lint` pass with no new TypeScript or ESLint
  error.

- [x] 2a. **Revise `AdminLogo` to use `Header.logo` instead of
  `Settings.icon`.** Change `AdminLogo`'s data source from
  `getCachedGlobal('settings', 1)()` to `getCachedGlobal('header', 1)()`,
  read `header.logo` instead of `settings.icon`, and use `header.logo.alt`
  directly as the `<img>`'s `alt` text instead of synthesizing
  `` `${siteName} logo` `` from Settings. `AdminIcon` is unchanged at this
  step. **Done when:** `npm run build` and `npm run lint` pass with no new
  error.

- [x] 2b. **Revise `AdminIcon` to use `Header.logo` too, and consolidate the
  shared fetch.** Change `AdminIcon`'s data source from
  `getCachedGlobal('settings', 1)()`/`settings.icon` to the same
  `Header.logo` source `AdminLogo` now uses. Extract the shared
  fetch-and-validate logic (the `try`/`catch` + `isDoc<Media>` + `.url`
  check) into one `getLogoSafely(): Promise<Media | null>` helper called by
  both exports, removing the now-fully-unused `getSettingsSafely`/`Setting`
  import. **Done when:** `npm run build` and `npm run lint` pass with no new
  error; the file no longer references `Setting` or `settings` anywhere.

- [x] 2c. **Revert `AdminIcon` to `Settings.icon`.** Split the consolidated
  `getLogoSafely()` back into two dedicated helpers -
  `getSettingsIconSafely(): Promise<Media | null>` (fetches
  `getCachedGlobal('settings', 1)()`, validates `settings.icon`) and
  `getHeaderLogoSafely(): Promise<Media | null>` (fetches
  `getCachedGlobal('header', 1)()`, validates `header.logo`) - each with its
  own `try`/`catch`. `AdminIcon` calls `getSettingsIconSafely()`; `AdminLogo`
  keeps calling `getHeaderLogoSafely()`. The `40px` nav-icon size override in
  `custom.scss` from step 4 is untouched - only the icon's image source
  reverts, not its size. **Done when:** `npm run build` and `npm run lint`
  pass with no new error; in the browser, the (still `40px`) nav icon shows
  the uploaded Site Icon again, and `/admin/login` still shows the Header
  Logo.

- [x] 3. **Wire the graphics components and regenerate the import map.** Add
  `admin.components.graphics: { Icon:
  '@/custom/admin-branding/Component.tsx#AdminIcon', Logo:
  '@/custom/admin-branding/Component.tsx#AdminLogo' }` to the `admin` block
  in `src/payload.config.ts`. Run `npm run generate:importmap`. **Done
  when:** `npm run build` passes; `src/app/(payload)/admin/importMap.js`
  includes both new imports; in the browser, `/admin/login` shows the
  uploaded Header Logo in place of the Payload wordmark, and the sidebar (on
  any authenticated `/admin` page) shows the same Header Logo in place of the
  default Payload icon glyph, at a sensible size.

- [x] 4. **Enlarge the nav icon.** Add
  `` .step-nav__home { width: 40px; height: 40px; } `` to
  `src/app/(payload)/custom.scss`. **Done when:** `npm run build` passes; in
  the browser, the nav icon (top header bar, next to the dashboard
  breadcrumb) renders at `40px` x `40px` at every viewport width, confirmed
  via browser inspector's computed style on `.step-nav__home`.

## Files / areas

- `src/payload.config.ts` - edit (`collections` array reorder;
  `admin.components.graphics.Icon`/`Logo` added)
- `src/collections/Pages/config.ts` - edit (`admin.group: 'Content'`)
- `src/collections/Posts/config.ts` - edit (`admin.group: 'Content'`)
- `src/collections/Categories/config.ts` - edit (`admin.group: 'Content'`)
- `src/collections/Media/config.ts` - edit (new `admin: { group: 'Content' }`)
- `src/globals/Header/config.ts` - edit (new
  `admin: { group: 'Site Identity' }`)
- `src/globals/Settings/config.ts` - edit (new
  `admin: { group: 'Site Identity' }`)
- `src/globals/Footer/config.ts` - edit (new
  `admin: { group: 'Site Identity' }`)
- `src/custom/admin-branding/Component.tsx` - new file (`AdminIcon`,
  `AdminLogo`)
- `src/app/(payload)/admin/importMap.js` - regenerated by
  `npm run generate:importmap`, not hand-edited
- `src/app/(payload)/custom.scss` - edit (`.step-nav__home` size override)

`payload-types.ts` is regenerated automatically by `npm run build` as a side
effect of the `collections` array reorder (member order only, confirmed via
an exactly balanced added/removed line count - no field or type content
changed); not hand-edited.

## Data / contracts

No new fields, collections, globals, or API surface. This feature only adds:

- `admin.group: 'Content' | 'Site Identity'` metadata to 7 existing
  collection/global configs (display grouping only).
- One new non-field custom component file rendering existing data
  (`Settings.icon` and `Header.logo`, both already required fields) - no new
  persisted data.
- `admin.components.graphics.Icon`/`Logo` config, pointing at that file.

## Testing

No pure logic beyond a `try`/`catch` fallback in a Server Component with a
hard dependency on the Payload admin runtime (`payload` global, `next/cache`),
which is not meaningfully unit-testable in isolation - matches this project's
existing precedent of not unit-testing admin-configuration/rendering code
(`Logo.tsx`, `ColorPickerField`, etc. have none). Verify manually with
`npm run dev` via `/try` after implementation:

- `/admin` sidebar shows "Content" (Pages/Posts/Categories/Media) and "Site
  Identity" (Header/Site Settings/Footer) groups, plus "Users" under the
  default "Collections" heading.
- `/admin/login` shows the uploaded Header Logo (not the Site Icon) instead
  of the Payload wordmark, at a readable size with correct aspect ratio, and
  its accessible name (inspect via browser devtools or a screen reader)
  matches the Logo's own alt text from Media.
- Any authenticated `/admin` page's sidebar icon shows the uploaded Site Icon
  (not the Header Logo) instead of Payload's default glyph, at its enlarged
  `40px` size, not clipped or overlapping the hamburger toggler/breadcrumbs
  beside it at both a wide and a narrow (below 1024px) viewport.
- Uploading a new Site Icon in Settings, or a new Logo in Header, and
  reloading `/admin`/`/admin/login` reflects the new image on its own slot
  with no restart, and does not affect the other slot (confirms the
  `getCachedGlobal`/`revalidateGlobal` cache-invalidation path works from
  both independent call sites).

## Notes for the AI

- Confirmed by reading `@payloadcms/ui`'s `groupNavItems.js`: a collection and
  a global sharing the same `admin.group` string genuinely merge into one
  sidebar section (grouping is keyed by the translated group label, entity
  type is irrelevant) - this is not an assumption, it's how Payload 3.82.1
  actually behaves.
- The two default groups ("Collections"/"Globals") always occupy fixed first
  slots in Payload's internal grouping array, filtered out only if empty. Any
  custom-named group is appended after them the first time it's encountered.
  Leaving `Users` ungrouped therefore puts its (now-solo) "Collections"
  bucket visually above "Content"/"Site Identity" - accepted as-is; a later
  `/fix` can reorder or rename it if that reads oddly in practice.
- `getCachedGlobal(...)()` calls `payload.findGlobal()` with no `user`
  argument, so `overrideAccess` defaults to `true` (full bypass) - correct
  here per this project's own Local API security rule: both are system-level
  reads rendering public branding, not operations performed on behalf of a
  specific user's permissions. `layout.tsx`'s `generateMetadata` already does
  the exact same unconditional call pattern for `Settings.icon` on the
  public-facing site, including for anonymous visitors - proven precedent
  for this same call shape, not a new risk.
- `settings.icon` and `header.logo` are both `required: true`, so the
  fetch-failure/unpopulated fallback branch in `getSettingsIconSafely()`/
  `getHeaderLogoSafely()` is real defensive code for infra failures, not an
  everyday path - don't skip it, but don't expect to exercise it in normal
  manual testing either.
- Final state, after four in-place revisions during this session: `AdminIcon`
  (nav) = `Settings.icon`, `AdminLogo` (login page) = `Header.logo` - two
  independent sources, not one shared one. An earlier revision briefly
  consolidated both onto `Header.logo` behind one shared helper, then a
  later explicit request ("put back the icon instead") reverted `AdminIcon`
  specifically. Don't re-consolidate these into a shared helper without a
  new request - the two-helper shape is the deliberate, current end state.
- Do not wrap `AdminIcon`/`AdminLogo`'s return value in a `<Link>` or other
  interactive wrapper - Payload's own `PayloadIcon`/`PayloadLogo` return bare
  graphics with no wrapper, and the surrounding nav/login layout already
  provides any click target or link semantics.
- Reuse the project's existing `isDoc<Media>()` guard and the exact `<img>` +
  `eslint-disable-next-line @next/next/no-img-element` pattern
  `src/globals/Header/Component/Logo.tsx` already uses for admin-uploaded
  images of arbitrary size - do not switch to `next/image` here for the same
  reasons that file documents (arbitrary SVG/size, no guaranteed dimensions).
- The `.step-nav__home` size override was traced, not guessed: `AdminIcon`
  renders via `templates/Default` -> `AppHeader` (`CustomIcon` prop) ->
  `StepNav` -> a `<span title="Dashboard">` inside `.step-nav__home`, all
  read from `@payloadcms/ui`'s and `@payloadcms/next`'s own compiled
  `dist/` source. `.step-nav__home`'s `18px`/`16px` (mid-break) sizing lives
  inside `@layer payload-default` in Payload's own `StepNav/index.scss` -
  `custom.scss` is deliberately unlayered (per that file's own top comment)
  so a plain, unconditional selector match beats both Payload variants at
  every viewport with no `!important` and no need to replicate the
  `max-width: 1024px` media query. If a future request needs the login-page
  `AdminLogo` resized too, trace its actual container the same way rather
  than assuming it shares any CSS with the nav icon - confirmed via the same
  source read that it does not (bare `<PayloadLogo />`/`<img>` return, no
  wrapping "-home"-style container).
