# Current Feature

**Title:** Header live preview crashes on a new Social Link or Button
**Type:** Fix
**Status:** verified
**Branch:** `fix/header-live-preview-link-crash`

## The problem

In the Header global's live preview, clicking **Add Social Link** (or **Add**
under Call to Action Buttons) crashes the preview iframe with:

```
Failed prop type: The prop `href` expects a `string` or `object` in `<Link>`,
but got `undefined` instead.
```

Cause: `socialLinks[].url` and `ctaButtons[].url` are `required` fields
(`src/globals/Header/config.ts:75-79` and `:97`), but a brand-new array row
starts with `url: undefined` until the editor fills it in. Every keystroke
re-renders the scoped live-preview data, and
[HeaderClient.tsx](src/globals/Header/Component/HeaderClient.tsx) passes that
`undefined` straight into `next/link`'s `href` prop for both sections:

- `src/globals/Header/Component/HeaderClient.tsx:187` (social links)
- `src/globals/Header/Component/HeaderClient.tsx:213` (CTA buttons)

The **Nav Links** section right above them already handles this correctly: it
computes `href = hrefForNavLink(item)` and skips the row with `if (!href)
return null` (`HeaderClient.tsx:158-159`). `FooterClient.tsx:53-54` uses the
same guard for its own nav links. Social links and CTA buttons never picked up
that guard.

## The fix

Mirror the existing nav-links guard in the two unguarded spots: compute
`item.url` into a local `href` before the `<Link>` and skip rendering that
row when it's falsy, exactly like `hrefForNavLink`'s call site does. No new
utility needed since these are plain `item.url` strings, not the
type/reference union `hrefForNavLink` resolves.

Must not change behavior for fully-filled rows (existing published data keeps
rendering exactly as it does today).

## Build steps

- [x] In `src/globals/Header/Component/HeaderClient.tsx`, add a `const href =
  item.url` (or inline falsy check) before each of the two `<Link
  href={item.url}>` usages (social links block and CTA buttons block) and
  `return null` for that row when it's empty, matching the nav-links pattern
  at line 158-159.
  - Done when: adding a new Social Link or a new Button row in the Header
    live preview no longer throws the `Link` prop-type runtime error, and
    existing rows with a real URL still render their link.

## Verify

- Open the Header global in the admin, with live preview visible.
- Click **Add Social Link**: preview must not show the `Runtime Error`
  overlay; the new (incomplete) row simply renders nothing extra yet.
- Click **Add** under **Call to Action Buttons**: same check.
- Fill in a URL on a new row and confirm its link/button now appears in the
  preview.
- Confirm existing, already-published social links and CTA buttons still
  render unchanged.
