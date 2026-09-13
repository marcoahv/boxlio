# Current Feature

**Title:** Feature Grid image not resizing like the others
**Type:** Fix
**Status:** verified
**Branch:** fix/feature-grid-image-preview-size

## The problem

On the real `home` page's `featureGrid` block, one feature's image rendered
taller than the fixed `card` box (640×360, 16:9) the other two got, in
**Live Preview only** — the actual published page always rendered all three
consistently. The reported "portrait vs. landscape" and "undersized image"
angles explored early on were both red herrings; the real distinguishing
factor turned out to be nothing about the image files at all.

**Root cause (confirmed via network inspection):** `Media/config.ts` set
`defaultPopulate` to a minimal field list (`url`, `filename`, `width`,
`height`, `alt`) that excluded `sizes` and `blurDataUrl`. `defaultPopulate`
governs *every* relationship population that doesn't explicitly override it.
The real page's queries always explicitly requested `populate: { media: {
sizes: {...} } }`, so they never hit this gap. But
`@payloadcms/live-preview`'s `mergeData` (used by
[useScopedLivePreview.ts](src/utilities/useScopedLivePreview.ts) to populate
relationships in the postMessage'd form data) has no way to pass its own
`select`/`populate` — it relies entirely on each collection's
`defaultPopulate`. So in Live Preview, every feature's `image` came back
*without* a `sizes` key at all, and
[getMediaSize.ts](src/utilities/getMediaSize.ts)'s fallback (`sized?.url ?
sized : doc`) silently rendered each image at its raw original dimensions
instead of the `card` crop. All three features were affected identically —
it was just far more visually obvious for the one feature whose original
happened to be a perfect square (4000×4000) than for the other two, whose
originals happened to already be closer to 16:9.

Verified directly: captured the actual `mergeData` POST response
(`/api/pages/<id>` with `X-Payload-HTTP-Method-Override: GET`) for the real
`home` page before and after the fix — before, every feature's `image` had no
`sizes` key at all; after, all three have the full `sizes` map with a correct
`card` (640×360) entry.

**Secondary, independently real bug found and fixed along the way:** Payload's
image-resize logic
(`node_modules/payload/dist/uploads/image-resizing/getImageResizeAction.js`)
omits generating a named size entirely when the source is smaller than the
target box in *both* dimensions, unless `withoutEnlargement` is set. None of
the four `imageSizes` in `Media/config.ts` set it, so any image smaller than
640×360 (e.g. small icons/logos already in the media library) got
`sizes.card: null`. This is real and now fixed too, but was **not** the cause
of the reported bug — the actual images involved (`2.webp`, `1-2.webp`,
`4-2.webp`) were all 4000px+ and always had valid `card` sizes; only their
*visibility* to Live Preview was broken.

## The fix

1. **The actual fix:** added `blurDataUrl: true` and `sizes: { thumbnail: true,
   card: true, fullSize: true, og: true }` to `Media/config.ts`'s
   `defaultPopulate`, so any caller relying on default relationship
   population (Live Preview included) gets the same fields the frontend
   components need.
2. **Secondary fix (kept, real but not the reported bug):** added
   `withoutEnlargement: false` to all four `imageSizes` entries in
   `Media/config.ts`, so undersized originals get a properly upscaled size
   instead of a silently omitted one.
3. Regenerated the media docs that already had `null` sizes from before fix
   #2 (one-off, via a temporary local-only endpoint that was deleted after
   use — not part of the shipped diff).
4. Added `tests/int/media.int.spec.ts` covering both fixes:
   `defaultPopulate` includes `sizes`/`blurDataUrl`, and every `imageSizes`
   entry sets `withoutEnlargement: false`.

Not touched: `FeatureGrid`/`MediaImage`/`getMediaSize` frontend rendering code
— both bugs were in how Media's relationship data is populated/generated, not
in how it's consumed.

## Verify

- Captured the Live Preview `mergeData` network response for the real `home`
  page: before the fix, all three features' `image` had no `sizes` key;
  after, all three have a correct `card` (640×360) entry.
- `npm run test:int` — 24/24 passing (incl. two new regression tests).
- `npm run lint` — 0 errors (pre-existing warnings, unrelated files).
- `npm run build` — compiles successfully.
- Manual: the user moved straight to `/complete` after the network-level fix
  confirmation above; no separate visual screenshot of the fixed Live Preview
  was captured in this session. If anything still looks off in Live Preview
  after this merge, it did not show up in the `mergeData` response itself.
