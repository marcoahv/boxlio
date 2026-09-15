# Boxlio - Project Overview

<!-- blueprint:source-hash 48cacbfee3690524145691f429a338c6b25bc8b6d662caa04cea191bdbc4695d -->

> A reusable Payload CMS + Next.js template, kept as a template repository and
> cloned fresh for each new site, rather than shipped as one specific product.

## Problem

Building a new site with Payload CMS means re-wiring the same plumbing every
time: a block-based page builder, blog engine, media pipeline, and SEO. This
project packages that plumbing once, plus a brand-swappable design token
system, so a new site starts from working infrastructure instead of an empty
Payload install.

## Users

- **The template maintainer** - clones this repo per new site and extends it.
- **A given site's content editors** - use the Payload admin to manage pages,
  posts, and site-wide settings. A planned admin/editor role split (feature
  24, not yet built) will restrict some site-wide controls, e.g. branding, to
  admins only.
- **A given site's visitors** - the public frontend.

Not an end-user-facing product on its own; "users" of any one deployment are
the two roles above.

## Features

1. **Page builder core** (shipped, headline feature) - `Pages` collection
   (Information/Layout/Blog Content/SEO tabs) with a block-based layout field,
   backed by a single block registry so a new block type is added once and
   becomes available everywhere.
2. **Blocks** (shipped) - `Hero`, `FeatureGrid`, `CallToAction`, `RichTextBlock`,
   `Table`, each with shared editor-controlled appearance (surface, spacing,
   width).
3. **Blog engine** (shipped) - `Posts` collection with author/category
   relationships, one-featured-post validation, and a rich text body that can
   itself embed the same registered blocks.
4. **Categories** (shipped) - `Categories` collection with a reverse
   relationship back to its posts.
5. **Media pipeline** (shipped) - `Media` collection with auto blur-placeholder
   generation, responsive webp image sizes, and optional S3-compatible
   storage.
6. **Site navigation & branding** (shipped) - `Header`, `Footer`, and
   `Settings` globals for logo, nav, social links, CTAs, and site identity.
7. **SEO** (shipped) - per-document SEO fields, canonical URL generation,
   sitemap control, `robots.ts`/`sitemap.ts` routes.
8. **Cache-tagged rendering** (shipped) - page/global reads cached and
   revalidated on change so admin edits appear without a stale cache.
9. **Admin auth** (shipped) - `Users` collection gates write access.
10. **Phase 7 legacy port** (shipped) - `Footer` global rebuild, and the
    `/blog` listing and `/blog/[slug]` detail pages, ported off the
    quarantined `src/_legacy/` CSS-Modules components onto the primitive
    components and semantic token system.
11. **Portable branding token system** (shipped) - consolidated design tokens
    (colors, typography, spacing, shadows, border-radius) into a single
    portable `branding.css` usable across different project stacks, plus a
    personality-selection guide based on the Website-Personalities-Framework
    (`theory-lectures.pdf` §26: 7 personalities - Serious/Elegant,
    Minimalist/Simple, Plain/Neutral, Bold/Confident, Calm/Peaceful,
    Startup/Upbeat, Playful/Fun - each applied across 7 design ingredients,
    with a trait-injection technique for blending neighboring personalities).
12. **Button color variants** (shipped) - `Ghost` variant (no fill/border,
    background on hover) alongside `Solid`/`Outline`; Solid and Outline use
    `--color-primary`/`--color-primary-light` fill+hover, Outline adds a
    `--color-primary-dark` border.
13. **Site-wide corner radius control** (shipped) - editor-controlled
    Settings fields (`imageRadius`, `buttonRadius`; None/Small/Medium/Large/
    Extra Large) driving `--radius-image`/`--radius-button` tokens across
    every image and button.
14. **Dark mode toggle** (shipped) - a visitor-facing manual light/dark
    override (`Header`'s `showThemeToggle`) that persists the chosen mode
    across visits and takes precedence over the OS `prefers-color-scheme`
    default.
15. **Live preview** (shipped) - client-side live preview (via
    `@payloadcms/live-preview-react`) for Pages and Posts, so unsaved editor
    changes render instantly in an admin preview pane with no save or
    drafts/versions required.
16. **Header live preview** (shipped) - extends live preview to the `Header`
    global via a slug-scoped `useScopedLivePreview` hook.
17. **Footer live preview** (shipped) - extends the same hook to `Footer`'s
    `navLinks` and appearance; its borrowed logo/site-name stay non-reactive.
18. **Blog listing content blocks** (shipped) - two blog-only block types
    (`Featured Post`, `Blog Listing`) on a conditional `blogBlocks` field,
    editor-configurable per block, kept separate from the shared block
    registry.
19. **Blog page live preview** (shipped) - extends live preview to the
    `/blog` listing page's own Pages document.
20. **Settings live preview** (shipped) - extends live preview to the
    `Settings` global's visibly-rendered fields (`siteName`, `imageRadius`).
21. **Site Colors control** (shipped) - editor-controlled Settings tab for the
    site's primary and secondary brand colors and their light/dark shades,
    wired via the same field -> runtime CSS custom property pattern as
    feature 13's corner radius control.
22. **Settings typography/spacing tab** (next) - editor-controlled Settings
    tab for site-wide typography (font family, heading scale) and/or spacing
    (container width), extending the Corners/Shadows/Colors pattern.
23. **Admin nav grouping & Settings-driven logo** (next) - group the admin
    nav (e.g. content vs. site-identity globals) and replace the default
    Payload admin logo/icon with one rendered from the already-uploaded
    `Settings.icon`, so a cloned site's admin panel reflects its brand
    without a separate admin-only asset upload.
24. **Role-based access control** (next) - add a `roles` field to `Users`
    (e.g. admin/editor) plus per-collection/global access functions and
    field-level conditions (e.g. restricting the Settings Colors tab to
    admins), replacing today's single-role "any authenticated user can edit
    everything" model.

## Data model

### Pages (`pages`)

- `slug` (text, unique, auto-generated)
- `title` (text, required)
- `featuredImage` (upload -> Media, required)
- `blocks` (blocks field, Layout tab) - any block from the shared registry
  (see Blocks below)
- `blogBlocks` (blocks field, Blog Content tab, visible only when
  `slug === 'blog'`) - `Featured Post` / `Blog Listing`, blog-only blocks not
  in the shared registry
- `meta` (group, SEO tab) - title/description/image/canonicalUrl,
  `addToSitemap` (checkbox, default true)

### Posts (`posts`)

- `slug` (text, unique, auto-generated)
- `title` (text, required)
- `summary` (textarea)
- `featured` (checkbox) - only one post may be `true` at a time (validated)
- `author` (relationship -> Users, required)
- `category` (relationship -> Categories)
- `date` (date, timezone-aware)
- `populatedAuthor` (virtual group, hidden) - denormalized `{ id, name }` cache
- `featuredImage` (upload -> Media, required)
- `breadcrumbs` (group) - show/hide + appearance (surface/spacing/width) for
  the Home / Blog / post-title trail
- `headerAppearance` (group) - appearance for the post's hero section
- `bodyAppearance` (group) - appearance for the rich text body section
- `body` (rich text, required) - can embed any registered block
- `meta` (group) - same SEO shape as Pages

### Categories (`categories`)

- `name` (text)
- `slug` (text, derived from `name`)
- `relatedPosts` (join -> Posts.category) - reverse relationship, not stored

### Media (`media`)

- `alt` (text, required)
- `blurDataUrl` (text, auto-generated, read-only)
- Upload sizes: `thumbnail` (320x180), `card` (640x360), `fullSize`
  (1280x720), `og` (1920x1080 png) - all webp except `og`
- Storage: local by default; S3-compatible when bucket/credential env vars
  are set

### Users (`users`)

- `name` (text, required)
- Payload auth (email/password) - currently the only access-control gate in
  the project; every authenticated user has full write access
- `roles` (select, planned - feature 24, not yet built) - will introduce an
  admin/editor distinction, backing per-collection/global access functions
  and field-level conditions

### Header (global, `header`)

- Appearance: `surface`, `width`, `position` (fixed/static), `height`
  (compact/normal/tall), `transparentAtTop` (checkbox), `showThemeToggle`
  (checkbox, default true - hides the dark mode toggle control when off)
- `logo`, `logoDark` (uploads -> Media; dark variant optional, falls back to
  the main logo)
- `navLinks` (array, 1-6) - `link` (relationship -> Pages, required),
  `newTab` (checkbox)
- `socialLinks` (array, up to 6) - `platform` (select), `url`, `icon` (upload)
- `ctaButtons` (array, up to 2) - `label`, `url`, `variant`
  (solid/outline/ghost), `color` (primary/secondary)

### Footer (global, `footer`)

- Appearance: `surface`, `spacing`, `width` (the shared block appearance
  field)
- `navLinks` (array, up to 6) - `link` (relationship -> Pages, required),
  `newTab` (checkbox)
- Logo and site name are borrowed from Header/Settings, not stored on Footer

### Settings (global, `settings`)

- **Information tab** - `siteName` (text, required, default "Boxlio"),
  `siteDescription` (textarea), `gtmCode` (text, Google Tag Manager),
  `icon`/`iconDark` (uploads -> Media, required/optional) - the browser-tab
  favicon; `icon` is also planned to drive the admin panel's own logo
  (feature 23, not yet built)
- **Corner Radius tab** - `imageRadius`, `buttonRadius` (select:
  none/sm/md/lg/xl)
- **Shadows tab** - `imageShadow`, `buttonShadow`, `cardShadow` (select:
  none/sm/md/lg)
- **Site Colors tab** - `primary`/`secondary` groups, each with `base`/
  `light`/`dark` hex-color fields (six tokens total: `--color-primary`/
  `-light`/`-dark`, `--color-secondary`/`-light`/`-dark`)
- **Typography/Spacing tab** (feature 22, not yet built) - planned font
  family/heading-scale and/or container-width controls

> Lock: every Settings site-wide style control (radius, shadow, colors, and
> the planned typography/spacing) follows the same pattern - a field on this
> global, mirrored onto a `data-*` attribute (or inline custom property) on
> `<html>` in `layout.tsx`, consumed by a CSS custom property in
> `styles/base/_alias-tokens.css`, and kept in sync during live preview by
> `SettingsLivePreviewSync.tsx`. Later style controls, including feature 22,
> should extend this pattern, not invent a new one.

### Blocks (embedded in `Pages.blocks` and `Posts.body`, via
`src/blocks/registry.ts`)

Every block shares an `appearanceField()` (surface, spacing, width) plus:

- **Hero** (`hero`) - `heading` (required), `subheading`, `image`, `layout`
  (imageRight/imageLeft/textOnly/backgroundImage), `overlayColor`
  (dark/light/primary/secondary, background-image layout only), `links`
  (array, up to 2: label/url/variant)
- **FeatureGrid** (`featureGrid`) - `heading`, `intro`, `columns` (2/3/4),
  `features` (array, 1-12, required: title/body/image)
- **CallToAction** (`callToAction`) - `heading` (required), `body`, `align`
  (center/left), `links` (array, 1-2, required: label/url/variant)
- **RichTextBlock** (`richText`) - `content` (rich text, required)
- **Table** (`table`) - tabular content, rows laid out horizontally in the
  admin editor

> Lock: the block registry pattern (`src/blocks/registry.ts`) is a hard
> contract - a new block must add its config + component there and nowhere
> else. Later features should extend this list, not bypass it.

Blog-only blocks (`Pages.blogBlocks`, `src/collections/Pages/blogBlocks/`) are
a **separate** registry, deliberately not merged into the shared one -
`Featured Post` and `Blog Listing` need page-level query results (pagination,
category filter) threaded in that the generic block dispatcher doesn't
support, and merging them would make them embeddable in Post bodies and every
other page.

## Tech stack

- **Next.js 16** - App Router; `(frontend)` route group for the public site,
  `(payload)` for the admin panel and Payload's own API/GraphQL routes
- **Payload CMS 3.82** - collections, globals, blocks, admin panel
- **MongoDB** (`@payloadcms/db-mongodb`) - the only datastore
- **Lexical** - rich text editor, with `BlocksFeature` so blocks embed inside
  post bodies
- **Tailwind CSS v4** - CSS-first `@theme` tokens; two-tier system (palette +
  semantic roles); `light-dark()` theming as the OS-driven default, with a
  manual override (`.dark`/`.light` class or `data-theme` attribute plus a
  persisted visitor preference) taking precedence when set
- **`@payloadcms/plugin-seo`** - per-document SEO fields
- **S3-compatible storage** (optional, env-gated) - falls back to local
  storage when unset
- **Resend** (optional, env-gated) - transactional email
- **Vitest** + **Playwright** - configured, no test files written yet
- **`@payloadcms/live-preview-react`** - client-side live preview for Pages,
  Posts, and the Header/Footer/Settings globals; merges unsaved editor
  changes into the rendered page via `postMessage`, no drafts/versions
  required

## Monetization

Not applicable. This is an internal starter template only - not intended to
be distributed or sold; it exists to bootstrap the author's own future sites.

## UI/UX

Design intent encoded in the tokens: brand-swappable (components reference
only semantic roles, never raw palette values, in block-level appearance
controls), light/dark via `light-dark()` as the OS-driven default, and
editor-controlled appearance so content editors pick semantic roles rather
than colors or pixel values *at the block level*. Site-wide style controls
(corner radius, shadows, and colors, with typography/spacing planned next)
are the deliberate exception to that rule at the Settings level - see the
Settings data model note above.

Features 10-21 above have all shipped: the Phase 7 legacy port, the portable
branding token system, corner radius/shadow/color controls, the manual dark
mode toggle, and live preview across every editable document type. Next up:
feature 22 (typography/spacing controls in Settings), feature 23 (admin nav
grouping and a Settings-driven admin logo), and feature 24 (role-based access
control distinguishing admin vs. editor).

- `/` and `/[slug]` - block-rendered pages (frontend)
- `/blog` and `/blog/[slug]` - blog listing and detail pages
- `/admin` - Payload admin panel

## Deployment

Not decided / per-project - this is a template repository cloned per site, so
the deploy target is chosen when a given site is built from it. The
originating course used Railway, but that is not a commitment for this
template.

Env vars: `DATABASE_URL`, `PAYLOAD_SECRET` (required); `SITE_NAME` (optional
identity); `S3_API`/`S3_BUCKET`/`S3_ACCESS_KEY_ID`/`S3_SECRET_ACCESS_KEY`/
`S3_PUBLIC_URL` (optional storage); `RESEND_API_KEY`/`EMAIL_FROM_ADDRESS`/
`EMAIL_FROM_NAME` (optional email).

> TODO: deploy target, build/start commands for that target, health check
> path, and domain notes all depend on the target chosen per site.

## Open questions

> `project-plan.md` §3 and §7 still describe the project as mid-way through
> the Phase 7 legacy port, with "new product features... deliberately on
> hold until that styling-system work lands." `build-plan.md` now shows that
> port, the token system, and thirteen further features (12-21: button
> variants, corner radius, shadows, dark mode, live preview across every
> global, blog content blocks, site colors) already shipped, plus three new
> features just queued (22 typography/spacing, 23 admin nav/logo, 24
> role-based access control). Update `project-plan.md` §3/§7's status
> narrative to match current reality, or confirm the "on hold" framing no
> longer applies, then re-run `/overview`.

> `project-plan.md` §4 still lists only `siteName`/`siteDescription`/
> `gtmCode` on `settings` and doesn't mention the `footer` global, the
> Settings icon/corner-radius/shadow/color fields, or the planned `roles`
> field on `users` (feature 24). The Data model section above reflects the
> actual current and planned schema, derived from build-plan.md's feature
> descriptions and the repository. Consider folding this detail back into
> `project-plan.md` §4 so the two plans stay in sync.
