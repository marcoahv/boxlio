# Project Plan

> One of the two planning docs you provide. Use as much detail as the project
> needs, including rationale, constraints, examples, edge cases, and explicit
> exclusions that should guide later feature work. Draft it directly, develop it
> through any AI conversation, or optionally run `/discovery` for a guided deep
> planning session. The content is always yours to direct. When it is filled in,
> run `/overview` to generate the project overview from this plus `build-plan.md`.

## 1. Problem - What problem are we solving?

A reusable Payload CMS + Next.js starter template, kept as a template
repository that gets cloned into a fresh repo each time a new site is built,
rather than shipped as one specific product. It solves the "rebuild the same
CMS plumbing every time" problem: a block-based page builder, blog engine,
media pipeline, SEO, and a brand-swappable design token system already wired
together, so a new site starts from working infrastructure instead of an
empty Payload install.

## 2. Users - Who is this for?

The developer(s) maintaining this template and reusing it to launch new sites.
Not an end-user-facing product on its own; the "users" of a given deployment
are that site's own content editors (via the Payload admin) and visitors (via
the public frontend). Planned: a role distinction (admin vs. editor) within
the Payload admin, restricting sensitive controls like site branding to
admins (build plan item 24).

## 3. Features - What does the MVP need?

Already shipped (see `build-plan.md` for the checked list): block-based page
builder (Hero, FeatureGrid, CallToAction, RichText blocks via a single
registry), blog with categories and featured-post logic, media pipeline with
auto blur-placeholder generation and responsive image sizes, header/footer
navigation and branding globals, per-document SEO with canonical URLs and
sitemap control, cache-tagged rendering with revalidation on save, Payload
auth for admin access.

Immediate next milestone (in order): finish the Phase 7 legacy port (see
`src/_legacy/README.md`), then expand and refine the design token system.
New product features are deliberately on hold until that styling-system work
lands.

## 4. Data - What are we storing?

- `pages` - block-based layout documents (title, featured image, blocks, SEO)
- `posts` - blog entries (title, summary, author, category, featured flag,
  rich text body that can itself embed blocks, SEO)
- `categories` - post categories, with a reverse `join` back to related posts
- `media` - uploads with auto-generated blur placeholder and thumbnail/card/
  fullSize/og image sizes
- `users` - Payload auth collection (admin access)
- `header` (global) - logo/dark logo, site icon/dark icon, nav links, social
  links, CTA buttons, appearance (surface, width, position, height, transparent-
  at-top)
- `settings` (global) - site name, site description, Google Tag Manager code

## 5. Tech - What stack are we using?

- Next.js 16 (App Router, route groups for `(frontend)` and `(payload)` admin)
- Payload CMS 3.82, MongoDB via `@payloadcms/db-mongodb`
- Lexical rich text editor, with a `BlocksFeature` so blocks can be embedded
  inside post bodies
- Tailwind CSS v4, CSS-first `@theme` config with a two-tier token system
  (primitive palette + semantic roles) and `light-dark()` theming as the
  OS-driven default, with a manual override (`.dark`/`.light` class or
  `data-theme` attribute + persisted visitor preference) taking precedence
  when set
- `@payloadcms/plugin-seo` for per-document SEO fields
- Optional S3-compatible storage (`@payloadcms/storage-s3`), activates only
  when bucket/credential env vars are set; falls back to local storage
  otherwise
- Optional Resend email adapter, activates only when its env vars are set
- Vitest (`tests/int/**/*.int.spec.ts`) and Playwright configured for testing;
  no test files exist yet
- `@payloadcms/live-preview-react` - client-side live preview for Pages and
  Posts; unsaved editor changes merge into the rendered page via
  `postMessage`, no drafts/versions required

## 6. Monetize - How will this make money?

Not applicable. This is an internal starter template only - it is not
intended to be distributed or sold; it exists solely to bootstrap the
author's own future sites.

## 7. UI/UX - How should this look and feel?

Mid-migration: the site builder moved from CSS Modules to the Tailwind v4
token system described above. `src/_legacy/README.md` tracks what is still
quarantined pending a "Phase 7" port (`Pagination`, `PostPreview`,
`Breadcrumbs`, `PostNavigation`, `Card`, `CategoryFilter`, `Footer`, and the
blog routes) onto `components/primitives/` (`Section`, `Container`, `Stack`)
and the semantic tokens in `styles/tokens/_semantic.css`.

Design intent already encoded in the tokens: brand-swappable (components
reference only semantic roles, never raw palette values), light/dark via
`light-dark()`, and editor-controlled appearance (surface, spacing, width) so
content editors pick semantic roles rather than colors or pixel values.

A manual dark mode toggle is now planned (build plan item 14): a visitor-facing
control that overrides the OS `prefers-color-scheme` default and persists the
chosen mode across visits.

Editors also get a live-updating preview pane (build plan item 15): editing a
Page or Post in the admin panel shows unsaved changes rendered instantly, no
save required. Header/Footer/Settings live preview is a deliberate later
addition, not part of this pass.

That preview pane is planned to become editable in the other direction too
(build plan items 29a/29b): clicking a plain text element rendered in the
preview iframe lets an editor type directly in place, with the edit flowing
back into the matching admin form field live. Rich text bodies and Posts stay
out of this - editing there remains sidebar-only.

The next planned UI/UX work, after the Phase 7 port, is making the token
system **portable across different project stacks**, not just this one.
Concretely: consolidate the design tokens (colors, typography, spacing,
shadows, border-radius) into a single `branding.css` file that can be dropped
into other projects independently of the Payload/Next.js/Tailwind plumbing
around it.

Alongside that file, add a personality-selection guide based on the
**Website-Personalities-Framework** (`theory-lectures.pdf`, section 26 /
lecture 26, the capstone of the "Web Design Rules and Framework" module). The
framework's method: pick one of 7 website personalities based on the desired
"vibe," then apply that personality's traits across 7 design ingredients
(typography, colors, images, icons, shadows, border-radius, layout). The 7
personalities: Serious/Elegant, Minimalist/Simple, Plain/Neutral,
Bold/Confident, Calm/Peaceful, Startup/Upbeat, Playful/Fun. It also teaches a
"trait injection" technique for blending traits from a neighboring
personality (on a Bold-Calm x Playful-Serious quadrant) into a primary
choice, rather than treating the 7 as rigid, mutually-exclusive buckets.
Full per-personality detail lives in the source PDF; capture the specific
token/guide structure when this is spec'd with `/feature`.

## 8. Deployment - Where and how will this ship?

Not decided / per-project: since this is a template repository cloned per
site, the deploy target is chosen when a given site is built from it, not
fixed here. The originating course (`payload-essentials-trancript.md`) used Railway,
but that is not a commitment for this template.

`.env.example` documents the required and optional env vars: `DATABASE_URL`,
`PAYLOAD_SECRET` (required); `SITE_NAME`; `S3_API`/`S3_BUCKET`/
`S3_ACCESS_KEY_ID`/`S3_SECRET_ACCESS_KEY`/`S3_PUBLIC_URL` (optional storage);
`RESEND_API_KEY`/`EMAIL_FROM_ADDRESS`/`EMAIL_FROM_NAME` (optional email).
