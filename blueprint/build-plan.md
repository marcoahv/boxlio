# Build Plan

> One of the two planning docs you provide. Write it directly, develop it through
> any AI conversation, or optionally run `/discovery`. Keep the items high-level
> even when `project-plan.md` is detailed; later `/feature` specs hold the depth
> for each build item.

The features that make up this project, high level and in rough build order, one
line each, no detail (that comes per feature). Rough is fine at first, but before
`/overview` runs this file should be shaped into a checkbox list the build loop
can track.

Keep it as a checklist. Run `/feature` with no number to spec the **next
unchecked** item, or `/feature 3` / `/feature "login"` to pick a specific one.
Completed features get checked off here, so the build plan doubles as your
progress tracker. A big item gets split into sub-items (4a, 4b, etc.) when you
spec it.

## Continuing after the initial build

This is a living roadmap, not a plan that freezes when the first release is
done. Keep completed items checked, then append new unchecked features as the
project grows. Optional milestone headings such as `## MVP` and `## Post-MVP`
keep a longer plan readable without changing how `/feature` finds the next
unchecked item.

Do not renumber completed features because their archived specs refer back to
those numbers. Continue with the next unused number. If a new feature materially
changes the product direction, users, data, stack, monetization, UI/UX, or
deployment, update the relevant part of `project-plan.md` too. Then re-run
`/overview` before spec'ing the feature.

You can edit this file directly or ask the AI to start a new feature by name. If
`/feature "team workspaces"` does not match an existing item, it will propose the
new build-plan line and any necessary project-plan changes, wait for approval,
refresh the overview, and then write the feature spec.

Scaffolding the app (create-next-app, etc.) and prototyping the look are
pre-build steps, not features (see the README), so don't list them here. Start
with your first real slice of functionality.

A common order that works well: build the core UI with placeholder data first,
then wire up data, auth, and integrations. Add deployment readiness only when
the app is worth shipping or a provider config change is part of the work. Adapt
it to your project.

## Format

Use checkboxes. Each item should be a feature-sized outcome, not a loose task or
a whole product area.

Good:

- [ ] 1. **Skill submission** - upload a skill package and save its metadata
- [ ] 2. **Validation result** - run checks and show pass/fail status for a skill
- [ ] 3. **Directory listing** - browse and filter published skills
- [ ] 4. **Deployment readiness** - configure Render or Vercel and verify the
  production build

Avoid:

- Upload stuff
- Database
- Make it look nice
- Auth, billing, dashboard, validation, and deploy

If your first pass is just rough bullets, that is okay. Run `/overview` after
filling both planning docs; it will flag plan-shape problems and can propose a
cleaned-up checkbox version before generating the project overview.

## Shipped

- [x] 1. **Page builder core** - `Pages` collection (Information/Layout/SEO
  tabs) with a block-based layout field, backed by a single block registry
  (`src/blocks/registry.ts`) so a new block only needs to be added once
- [x] 2. **Blocks** - `Hero`, `FeatureGrid`, `CallToAction`, `RichTextBlock`,
  each with editor-controlled appearance (surface, spacing, width)
- [x] 3. **Blog engine** - `Posts` collection with author/category
  relationships, one-featured-post validation, and a rich text body that can
  embed the same registered blocks
- [x] 4. **Categories** - `Categories` collection with a reverse `join` back to
  its related posts
- [x] 5. **Media pipeline** - `Media` collection with auto blur-placeholder
  generation, webp thumbnail/card/fullSize/og image sizes, and optional
  S3-compatible storage (env-gated, falls back to local storage)
- [x] 6. **Site navigation & branding** - `Header` global (logo/dark logo,
  icon/dark icon, nav links, social links, CTA buttons, scroll/appearance
  behavior) and `Settings` global (site name, description, GTM code)
- [x] 7. **SEO** - `@payloadcms/plugin-seo` wired per document with canonical
  URL generation, sitemap opt-out, `robots.ts`/`sitemap.ts` routes
- [x] 8. **Cache-tagged rendering** - page and global reads tagged and
  revalidated on change/delete so admin edits show up without a stale cache
- [x] 9. **Admin auth** - `Users` collection with Payload auth gating write
  access to content

## Next

- [x] 10a. **Footer port** - rewrite `Footer` against the current schema
  (the old `Nav` global and `Setting.logoColor`/`logoWhite` fields it used no
  longer exist), reusing the existing `Logo` component and `header.logo`;
  gave Footer its own `navLinks` field plus editable appearance (`surface`/
  `spacing`/`width`, the same shared field every block uses) on a new
  `footer` global rather than borrowing `header.navLinks`; reorganized
  `Header`/`Footer` (config + component) under `src/globals/<Name>/`
- [x] 10b. **Blog listing page** (`/blog`) - built the missing `CardContainer`
  grid wrapper and ported `Card`, `PostPreview`, `Pagination`, `CategoryFilter`
  (fixed its duplicate `router` declaration bug), wired into a new
  `src/app/(frontend)/blog/page.tsx` via the `Section`/`Container`/`Heading`
  primitives; added a missing `Categories` cache-invalidation hook and fixed
  an untagged page-metadata cache; first Vitest test in the project
  (`Pagination`'s `buildHref`)
- [x] 10c. **Blog post detail page** (`/blog/[slug]`) - port `Breadcrumbs` and
  `PostNavigation`, reusing 10b's `Card`/`CardContainer`/`PostPreview` and the
  existing `RichText` component, wired into
  `src/app/(frontend)/blog/[slug]/page.tsx`; delete `src/_legacy/` once this
  lands
- [x] 11. **Portable branding token system** - consolidate design tokens
  (colors, typography, spacing, shadows, border-radius) into a single
  portable `branding.css`, usable across different project stacks, plus a
  personality-selection guide based on the Website-Personalities-Framework
  (`theory-lectures.pdf` §26)
- [x] 12. **Button color variants** - add a Ghost button (no fill/border,
  background on hover) alongside Primary/Outline; Primary and Outline use
  `--color-primary`/`--color-primary-light` fill+hover, Outline adds a
  `--color-primary-dark` border
- [x] 13. **Site-wide image border radius control** - editor-controlled
  Settings field (None/Small/Medium/Large/Extra Large) driving a
  `--radius-image` token that cascades from `<html>` to every image
  (Hero, FeatureGrid, blog Card, PostPreview, rich-text inline images)
- [x] 14. **Dark mode toggle** - manual light/dark override (toggle control,
  e.g. in the header) that persists the visitor's choice across visits and
  takes precedence over the OS `prefers-color-scheme` default
- [x] 15. **Live preview** - client-side live preview (via
  @payloadcms/live-preview-react) for Pages and Posts, so unsaved edits
  update instantly in an admin preview pane without requiring drafts or
  publishing
- [x] 16. **Header live preview** - extend feature 15's client-side live
  preview to the `Header` global (the fast-follow that feature 15
  deliberately deferred), via a new slug-scoped live-preview hook so
  Header's subscription — mounted on every page via the root layout —
  doesn't corrupt or get corrupted by the existing Pages/Posts live-preview
  hooks it now coexists with; Footer and Settings live preview stay a
  separate future addition
- [x] 17. **Footer live preview** - extend the `useScopedLivePreview` hook
  from feature 16 to the `Footer` global's own fields (`navLinks`,
  appearance); Footer's logo/site-name (borrowed from Header/Settings) stay
  non-reactive during preview, matching how Post's breadcrumbs stayed
  non-reactive in feature 15
- [x] 18. **Blog listing content blocks** - replace `/blog`'s hardcoded
  hero/listing template with two dedicated blog-only block types (Featured
  Post, Blog Listing) on a new conditional `blogBlocks` field, so editors
  can add, reorder, or omit them and configure appearance per block; kept
  separate from the shared page-builder `blocks` field/registry, since the
  listing needs page-level query results (pagination, category filter)
  threaded in that the generic block dispatcher doesn't support, and mixing
  it into the shared registry would also make it embeddable in Post bodies
  and every other page
- [x] 19. **Blog page live preview** - extend live preview to the `/blog`
  listing page's own Pages document (`slug: 'blog'`), whose route is
  currently excluded on purpose (separate template). Edits to its `blocks`
  and `blogBlocks` (Featured Post / Blog Listing) update live, matching
  `[slug]` and post pages; the Post/Category data those blocks render
  (heroPost, featuredBlog, categories, paginated posts) stays
  server-computed and non-reactive, same as Post's related-posts and
  Footer's borrowed fields
- [x] 20. **Settings live preview** - extend live preview to the `Settings`
  global (`admin.livePreview.globals` gains `'settings'`, reusing the `'/'`
  homepage URL every global already resolves to). Wires the two Settings
  fields that actually render visibly on the frontend: `siteName` (Footer's
  copyright line, static since feature 17) becomes reactive via a second
  `useScopedLivePreview` instance in `FooterClient`; `imageRadius` (the
  `data-image-radius` attribute on `<html>` driving `--radius-image`
  site-wide, feature 13) becomes reactive via a new always-mounted client
  component that syncs the attribute on live-preview messages, following the
  theme-toggle's existing `document.documentElement` pattern.
  `siteDescription`, `gtmCode`, and the site icons stay non-reactive -
  head-only/favicon fields never get live-preview reactivity, same rule
  already applied to `meta` on Pages/Posts/blog
- [x] 21. **Site Colors control** - editor-controlled Settings tab for the
  site's primary and secondary brand colors and their light/dark shades (the
  six `--color-primary`/`-light`/`-dark` and `--color-secondary`/`-light`/
  `-dark` tokens), wired via the same field -> runtime CSS custom property
  pattern as feature 13's image/button corner radius
- [x] 22. **Settings typography/spacing tab** - editor-controlled Settings tab
  for site-wide typography (font family, heading scale) and/or spacing
  (container width), wired via the same field -> `data-*` attribute -> CSS
  custom property -> live-preview-sync pattern as Corners/Shadows/Colors
  (features 13/20/21)
- [ ] 23. **Admin nav grouping & Settings-driven logo** - group the admin nav
  via `admin.group` (e.g. Pages/Posts/Categories vs. Header/Settings/Footer)
  and replace the default Payload admin logo/icon with one rendered from the
  already-uploaded `Settings.icon`, so a cloned site's admin panel reflects
  its brand without a separate admin-only asset upload
- [ ] 24. **Role-based access control** - add a `roles` field to `Users` (e.g.
  admin/editor) plus per-collection/global `access` functions and
  field-level `admin.condition` gating (e.g. restricting Settings' Colors
  tab to admins), replacing today's single-role "any authenticated user can
  edit everything" model
