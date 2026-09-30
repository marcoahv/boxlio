# Current Feature

**Title:** Boxlio blog content and About page seed

**Type:** Fix

**Status:** verified

**Branch:** fix/boxlio-blog-and-about-content

## The problem

The blog engine, page builder, and block registry are all fully shipped
(build-plan items 3, 10b, 10c, 18), but there is real content missing:

- `posts` has **zero** documents, so `/blog` and the Featured Post / Blog
  Listing blocks currently have nothing to show.
- There is no page introducing the Boxlio project itself.

Nothing needs to be built to fix this: it's a content gap, not a missing
capability. This is scoped as a one-time content operation (`/fix`), not a
build-plan feature.

## The fix

Add 5 real blog posts about the Boxlio project, and one new "About Boxlio"
Page built from existing blocks. All content is written below; `/implement`
inserts it, it does not draft it.

### Why this needs a temporary Next.js route, not a standalone script

Research for this spec confirmed (via a throwaway create-then-delete test
against the live database) that `Posts`' and `Pages`' `afterChange` hooks
(`src/collections/Posts/hooks/revalidatePost.ts`,
`src/collections/Pages/hooks/revalidatePage.ts`) call `revalidatePath`/
`revalidateTag` from `next/cache`. Those throw `Invariant: static generation
store missing` when called outside a real Next.js request, which aborts the
whole `payload.create()` call (Payload runs it inside a transaction, so no
partial doc is left behind, but nothing gets created either). A plain
`tsx`/`node` script calling Payload's Local API directly cannot create these
documents.

The fix: a temporary Next.js Route Handler, hit once while `npm run dev` is
running, so the hooks execute inside a real request and revalidate exactly
like every other content edit in this project. Do not silence or bypass the
revalidation hooks to make a standalone script work instead; that would
leave the cache stale, which is the opposite of this project's standing
cache-tagging rule (`blueprint/context/coding-standards.md`'s Payload CMS
section).

Also noted, not part of this fix: `getPayload()` currently throws an
*unhandled promise rejection* on every call (`payload`'s own async
dependency checker) because `@payloadcms/live-preview` is pinned to
`^3.89.0` in `package.json` while every other `@payloadcms/*` package is
pinned to `3.82.1`. It doesn't block `npm run dev` or the Local API (Payload
fires the check with `void`, so it never blocks `await getPayload()`), but
it's a real, pre-existing drift worth its own fix later. Do not touch
`package.json` as part of this content-only change.

### Reused existing data (do not create new Users, Categories, or Media)

Confirmed against the live database:

- **Author (all 5 posts):** the one existing `users` document, "Marco"
  (`marcoahvega@gmail.com`). Look it up via `payload.find({ collection:
  'users', limit: 1 })` rather than hardcoding its id.
- **Category (all 5 posts):** the one existing `categories` document,
  "Web design" (slug `web-design`). Look it up via `payload.find({
  collection: 'categories', limit: 1 })` rather than hardcoding its id.
- **Featured images:** look each of these up by `filename` (via
  `payload.find({ collection: 'media', where: { filename: { equals:
  '<name>' } } })`), not by hardcoding a Mongo id:
  - Post 1: `pexels-pixabay-219838.webp`
  - Post 2: `olivier-miche-ozacaauskhg-unsplash.webp`
  - Post 3: `2.webp`
  - Post 4: `3.webp`
  - Post 5: `6.webp`
  - About page: `5.webp`

If any of these lookups comes back empty (author, category, or one of the
6 media filenames), stop and report it rather than substituting something
else; the content below assumes they exist exactly as confirmed.

### Idempotency guard

Before creating each of the 6 documents, check whether a `posts`/`pages`
document with that exact `title` already exists and skip creation if so.
This is a one-time, throwaway route, but it may get triggered more than
once by accident, and it must not duplicate content on the live site.

### 5 Blog posts

Every post shares: `author` and `category` from above, `featured: false`
unless noted, `date_tz: 'America/New_York'`. Leave `slug`, `summary`'s
sibling `generateSlug`, `breadcrumbs`, `headerAppearance`, `bodyAppearance`,
and `meta` unset so the collection's own defaults apply (slug auto-generates
from `title`, same as every other post).

Body content below is written as a sequence of an intro paragraph, then
`## `-marked H2 sections each with one paragraph, then a closing paragraph.
Build each post's Lexical `body` as the matching sequence of `heading`
(`tag: 'h2'`) and `paragraph` nodes (plain text runs, no marks needed) in
that exact order — the same `SerializedEditorState` shape confirmed working
against this schema during this spec's research (root -> children of
`heading`/`paragraph` nodes, each with a single `text` child).

---

**1. "Introducing Boxlio: A Reusable Payload CMS + Next.js Starter"**
`featured: true` · `date`: 2026-09-08, 09:00 America/New_York
`featuredImage`: `pexels-pixabay-219838.webp`
`summary`: "Why Boxlio exists, what it packages out of the box, and who it's for."

Body:

> Building a new site with Payload CMS means re-wiring the same plumbing
> every time: a block-based page builder, a blog engine, a media pipeline,
> and SEO. Boxlio packages that plumbing once, so a new site starts from
> working infrastructure instead of an empty Payload install.
>
> ## A template, not a product
>
> Boxlio is a reusable Payload CMS and Next.js template, kept as a template
> repository and cloned fresh for each new site rather than shipped as one
> specific product. Every project that starts from Boxlio inherits the same
> foundation: a page builder, a blog engine, a media pipeline, SEO wiring,
> and a brand-swappable design token system.
>
> ## Who it's for
>
> Three roles use a Boxlio site. The template maintainer clones the
> repository and extends it for a new project. A site's content editors use
> the Payload admin panel to manage pages, posts, and site-wide settings, no
> code required. And a site's visitors see the public frontend those editors
> build. Today every authenticated admin user has full write access; a role
> split between admins and editors is still an open question for a future
> version.
>
> ## What's next
>
> This post kicks off a short series walking through what's already built
> into Boxlio: the block-based page builder, live preview and inline
> editing, the portable branding token system, and the media, SEO, and
> caching layer underneath it all.

---

**2. "Build Any Page Without Touching Code: Boxlio's Block-Based Page Builder"**
`date`: 2026-09-13, 09:00 America/New_York
`featuredImage`: `olivier-miche-ozacaauskhg-unsplash.webp`
`summary`: "How one shared block registry powers every page, and every blog post, in Boxlio."

Body:

> Every page in Boxlio is built from the same set of blocks, arranged and
> configured in the Payload admin panel rather than hand-coded per page. The
> Pages collection holds an Information tab, a Content/Layout tab, and an
> SEO tab; the Layout tab is where the page actually gets built, block by
> block.
>
> ## One registry, every block
>
> Every block, Hero, Feature Grid, Call to Action, Rich Text, and Table, is
> defined once in a single block registry. Adding a new block type means
> adding its config and its component and registering it in that one file;
> nothing else in the project needs to change for it to show up as an
> option everywhere blocks are allowed.
>
> ## Editor-controlled appearance, not raw styling
>
> Every block shares the same appearance controls: surface, spacing, and
> width. Editors pick a semantic role, like a muted background or a
> primary-color surface, never a raw color or pixel value. That constraint
> is deliberate: it makes an off-brand page unrepresentable by construction,
> and it means a brand-wide palette change updates every block at once.
>
> ## Blocks inside blog posts, too
>
> The same registry that powers Pages also powers Posts. A blog post's body
> is rich text that can embed any registered block directly in the content,
> so a long-form post can drop in a Feature Grid or a Call to Action without
> leaving the writing flow.
>
> Next in this series: how live preview and inline editing let an editor
> see and make those changes without ever leaving the page.

---

**3. "See Your Changes Instantly: Live Preview and Inline Editing in Boxlio"**
`date`: 2026-09-18, 09:00 America/New_York
`featuredImage`: `2.webp`
`summary`: "From live preview to click-to-edit text, how Boxlio keeps the admin panel and the page in sync."

Body:

> Editing a page and checking the result used to mean saving, then switching
> tabs to see what changed. Boxlio's live preview closes that loop: unsaved
> edits in the admin panel render instantly in a preview pane, with no save,
> draft, or publish step required.
>
> ## Beyond Pages and Posts
>
> Live preview started with Pages and Posts and has since extended to the
> Header, Footer, and Settings globals, plus the `/blog` listing page's own
> content blocks. Editing the site name, a nav link, or the homepage hero
> all update the same way: instantly, in place.
>
> ## Hover to find it, click to edit it
>
> A second layer sits on top of live preview: hovering a block row in the
> admin panel highlights that exact block in the preview, and inline text
> fields, headings, button labels, feature copy, can be edited by clicking
> directly on the rendered text in the preview iframe. The change flows back
> into the matching admin form field live, so the normal save flow picks it
> up unchanged.
>
> ## Rich text gets the same treatment
>
> Selecting text inside a Rich Text block or a post's body in the preview
> now surfaces a floating formatting toolbar, so bold, italic, and link
> formatting can be applied directly in place, not just plain text.
>
> Next: the design token system that makes a single template work for very
> different brands.

---

**4. "One Design System, Any Brand: Boxlio's Portable Token System"**
`date`: 2026-09-23, 09:00 America/New_York
`featuredImage`: `3.webp`
`summary`: "How a single portable stylesheet and a Settings panel let Boxlio serve very different brands from the same codebase."

Body:

> A template that only looks good with one color palette isn't really
> reusable. Boxlio's design tokens, colors, typography, spacing, shadows,
> and border radius, are consolidated into a single portable stylesheet so
> the same component code can carry a completely different brand.
>
> ## Swap the palette, not the components
>
> Components and blocks reference only semantic tokens, never raw palette
> values directly. A brand swap touches one file of literal values; every
> component that references a semantic token, like a primary-color surface
> or a card shadow, updates automatically.
>
> ## Editor-controlled, site-wide
>
> Beyond the block-level surface control, Settings has its own tabs for
> site-wide style: Colors, Corners, Shadows, Typography, and Whitespace.
> Each field follows the same pattern, a Settings field drives a CSS custom
> property on the page, and stays in sync during live preview, so a color or
> radius change previews instantly across the whole site, not just one
> block.
>
> ## A framework for picking values, not just changing them
>
> Choosing tokens for a new brand isn't guesswork. Boxlio includes a
> personality-selection guide covering seven website personalities, from
> Serious/Elegant to Playful/Fun, each mapped across the same set of design
> ingredients, to guide which values fit a given brand.
>
> Last in this series: the infrastructure underneath all of it, media, SEO,
> and caching.

---

**5. "What's Under the Hood: Media, SEO, and Caching in Boxlio"**
`date`: 2026-09-28, 09:00 America/New_York
`featuredImage`: `6.webp`
`summary`: "The infrastructure layer that keeps a Boxlio site fast, discoverable, and easy for editors to manage."

Body:

> Three pieces of plumbing rarely get admired directly, but every site needs
> them: image handling, search engine metadata, and caching. Boxlio wires up
> all three so a new site starts with working infrastructure instead of
> empty configuration.
>
> ## Media that optimizes itself
>
> Every image uploaded to Boxlio's Media collection automatically gets a
> blur placeholder and a set of responsive webp sizes, thumbnail, card, full
> size, and an Open Graph size, generated on upload. Storage falls back to
> local disk by default and switches to S3-compatible storage automatically
> when the right environment variables are set, no code change required.
>
> ## SEO wired per document
>
> Every page and post carries its own SEO fields, title, description, share
> image, and canonical URL, powered by the Payload SEO plugin. A site's
> sitemap and robots routes are generated from the same data, and any
> document can opt out of the sitemap individually.
>
> ## Cache-tagged rendering
>
> Pages and global content are cached and tagged per document. Editing a
> page in the admin panel triggers exactly the right cache tag to
> revalidate, so the change appears on the live site immediately without a
> stale cache lingering, and without invalidating unrelated pages.
>
> That's the last piece of this introduction to Boxlio: a page builder, live
> preview, a portable design system, and the infrastructure to back it all
> up.

### 1 new Page: "About Boxlio"

`title`: "About Boxlio" (slug auto-generates to `about-boxlio`)
`featuredImage`: `5.webp`
`blocks` (in this order):

**Hero** (`blockType: 'hero'`)
- `layout: 'textOnly'` (no image/video fields needed for this layout)
- `heading`: "Boxlio"
- `subheading`: "A reusable Payload CMS and Next.js template: a block-based
  page builder, a blog engine, live preview, and a portable design token
  system, ready to clone for the next site."
- `links`: one button, `{ label: "Read the blog", url: "/blog", variant:
  "solid", color: "primary" }`

**FeatureGrid** (`blockType: 'featureGrid'`)
- `heading`: "What's inside"
- `intro`: "Everything a new site needs is already wired up."
- `columns: '4'`
- `features` (no `image` on any of these; the component renders fine
  without one):
  1. "Block-based page builder" - "Hero, Feature Grid, Call to Action, Rich
     Text, and Table blocks, all sharing the same editor-controlled
     appearance controls."
  2. "Blog engine" - "Posts with authors, categories, and a rich text body
     that can embed the same blocks used to build pages."
  3. "Live preview and inline editing" - "Unsaved changes render instantly,
     down to clicking text directly in the preview to edit it in place."
  4. "Portable design tokens" - "One stylesheet of colors, typography,
     spacing, shadows, and radius, so a brand swap never touches component
     code."

**RichTextBlock** (`blockType: 'richText'`)
- `content`: one H2 + one paragraph, same Lexical shape as the post bodies:
  - H2: "Under the hood"
  - Paragraph: "Boxlio runs on Next.js and Payload CMS, backed by MongoDB,
    styled with Tailwind CSS, and edited through Lexical rich text. Page and
    global reads are cached and tagged per document, so admin edits show up
    without a stale cache. Media uploads generate their own blur
    placeholders and responsive sizes automatically."

**CallToAction** (`blockType: 'callToAction'`)
- `heading`: "See it in action"
- `body`: "The blog walks through the page builder, live preview, the
  design token system, and the infrastructure underneath."
- `links`: one required link, `{ label: "Visit the blog", url: "/blog",
  variant: "solid", color: "primary" }`

Leave `meta` (SEO) unset on the Page too; its fields aren't required.

## Build steps

- [x] 1. Create `src/app/(payload)/api/tmp-boxlio-content-seed/route.ts`: a
  `GET` handler that calls `getPayload({ config })`, looks up the author,
  category, and 6 media docs by the filenames above (failing loudly if any
  are missing), creates the 5 posts and the About page with the exact
  content above via `payload.create()` (no `user` passed, so the default
  administrative `overrideAccess: true` applies, per
  `.claude/rules/security-critical.md`), skips any title that already
  exists, and returns a JSON summary of what it created or skipped. Guard
  the route with `if (process.env.NODE_ENV === 'production') return new
  Response('Not found', { status: 404 })`. Run `npm run dev`, hit the route
  once (e.g. `curl http://localhost:3000/api/tmp-boxlio-content-seed`),
  confirm the JSON response shows 5 posts and 1 page created with no errors,
  then delete `src/app/(payload)/api/tmp-boxlio-content-seed/route.ts` so no
  trace of the temporary route remains in the working tree or git history.
  Done when: `git status` shows only the real Payload data changes (no
  files), `/blog` lists all 5 posts, `/blog/<slug>` renders each one's full
  body with headings, the Payload admin's Posts and Pages lists show
  exactly 5 and 1 new documents with exactly one post flagged Featured, and
  `/about-boxlio` renders the Hero, Feature Grid, Rich Text, and Call to
  Action blocks correctly with a working "Read the blog"/"Visit the blog"
  link back to `/blog`.

## Verify

- `npm run dev`, then in a browser:
  - `/blog` - all 5 posts appear, each with its image, summary, "Marco" as
    author, and the "Web design" category; the Featured Post block (if
    present on `/blog`) shows post 1.
  - Each `/blog/<slug>` - full body renders with its headings and
    paragraphs, breadcrumbs show Home / Blog / post title.
  - `/about-boxlio` - Hero (text-only), the 4-item Feature Grid, the Rich
    Text section, and the Call to Action all render; both internal links go
    to `/blog`.
  - `/admin/collections/posts` and `/admin/collections/pages` - 5 and 1 new
    documents respectively, editable and re-saveable like any other content.
- `npm run lint` passes on the temporary route file before it's deleted.
- Confirm no leftover files: `git status` is clean of anything under
  `src/app/(payload)/api/tmp-boxlio-content-seed/`.

## Notes for the AI

- This is content, not a feature: no new fields, components, or collection
  changes. Every field used above already exists exactly as described in
  `src/collections/Posts/config.ts`, `src/collections/Pages/config.ts`, and
  `src/blocks/{Hero,FeatureGrid,CallToAction,RichTextBlock}/config.ts`.
- Do not add this to `blueprint/build-plan.md`; `/fix` items aren't planned
  features.
- Do not touch `package.json` to fix the unrelated `@payloadcms/live-preview`
  version drift noted above; flag it to the user separately if asked.
- If `npm run dev` is already running when this is implemented, reuse that
  session instead of starting a second one.

## Implementation notes

Built and verified 2026-09-29. The temporary route
`src/app/(payload)/api/tmp-boxlio-content-seed/route.ts` was created, hit once
against a running `npm run dev` (response: 5 posts + "About Boxlio" page
created, 0 skipped), verified live (`/blog`, all 5 `/blog/<slug>` links,
`/about-boxlio`, and a direct read-only database check confirming 5 posts with
exactly one `featured: true` and the About page's 4 blocks in the right
order), then deleted. `npm run lint` (0 errors) and `npm run build` (compiled
successfully) both passed after the route was removed, leaving no trace of it
in the working tree.
