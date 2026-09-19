# Current Feature

**Title:** Clicking an internal link in Live Preview navigates the iframe and permanently kills inline editing there
**Type:** Fix
**Status:** verified
**Branch:** `fix/live-preview-nav-guard`

## The problem

Reproduced in a real browser: with the home page open in Live Preview, 12
elements are inline-editable (`[data-editable-field]`,
`[contenteditable="true"]`). Clicking the "Blog" nav link inside the iframe
client-side-navigates to `/blog`, and editability drops to 0 there -
permanently (checked 4s later, still 0). The "except the logo" observation
isn't special-cased anywhere in the code: from the home page the logo links
to `/`, which is already the current route, so no navigation happens at all.

Root cause, confirmed by logging every `postMessage` in and out of the
iframe: Payload's Live Preview data channel is only (re-)established when the
iframe's own `load` event fires - a real navigation. `next/link`'s client-side
routing swaps the page's content without that event ever firing again. After
the "Blog" click, `payload-live-preview` messages simply stop arriving -
confirmed with a 4-second observation window, zero further messages. This
happens even though everything on our side re-subscribes correctly:
`/blog`'s own `useIsLivePreviewActive({ collectionSlug: 'pages' })` mounts
fresh and starts listening, and `useScopedLivePreview`'s effect re-sends its
`ready()` handshake - the parent (Payload's admin `LivePreviewWindow`) just
never answers a second time, because it's driven by the iframe's `load`
event, not by that handshake message.

This is a real gap in combining Payload Live Preview with client-side
routing, not a bug in this project's own inline-edit/hover-sync code - that
code just makes the loss of the live-preview channel visible, since
`EditableFieldContext`'s `isEditable` flag is derived from it
(`src/app/(frontend)/[slug]/PageClient.tsx`,
`src/app/(frontend)/blog/BlogPageClient.tsx`).

## The fix

Decided with the user: rather than special-casing individual links (or
hiding/styling them), prevent same-tab internal navigation entirely while
genuinely inside Live Preview, silently (no visual cue - the editor already
knows they're in a preview), and site-wide (Header/Footer nav, and any link
rendered inside a block - Hero/CTA buttons, rich-text links - since the same
root cause applies to all of them identically, not just nav). This is also
forward-compatible with the planned link-editing feature: that work would
later replace the prevented click with opening a link editor, rather than
undoing this fix.

- **`src/utilities/useIsInsideLivePreview.ts`** (new) - like
  `useIsLivePreviewActive`, but resolves `true` on **any** genuine
  `payload-live-preview` message carrying a real document (a `collectionSlug`
  or `globalSlug`), not one specific target. A nav guard needs to know "are we
  genuinely inside Payload's Live Preview at all," which no single page's
  per-target hook can answer for content (like Header/Footer) that renders
  outside that page's own React tree. Keep `useIsLivePreviewActive`'s existing
  per-target behavior and comment about not using an iframe-embedding
  heuristic instead (the same reasoning applies here: real visitors embedding
  the site in an iframe must never have their navigation broken).

  **Found during implementation:** `isLivePreviewEvent` alone isn't enough -
  `@payloadcms/live-preview`'s own `ready()` posts a bare
  `{ type: 'payload-live-preview', ready: true }` handshake to
  `window.opener || window.parent`, which is the window itself on an ordinary
  top-level page with neither, so it self-delivers on *every* page view, live
  preview or not. `useIsLivePreviewActive` was never fooled by this only
  because its per-target match implicitly requires a `collectionSlug`/
  `globalSlug` the bare ping never carries. Confirmed live: without also
  requiring one of those fields, this hook (and the nav guard built on it)
  fired - and blocked navigation - on every plain page visit. The
  `collectionSlug`/`globalSlug` check closes this, and the message-shape
  check is extracted as `isGenuineLivePreviewDocumentMessage` for a focused
  regression test.
- **`src/utilities/shouldInterceptLivePreviewNavClick.ts`** (new) - the pure
  decision ("does this click need to be stopped"), extracted out of the DOM
  handling so it's unit-testable without a browser: plain left-click, no
  modifier keys, same-origin, not `target="_blank"`, not a same-page hash
  link.
- **`src/utilities/LivePreviewNavGuard.tsx`** (new) - renders nothing; once
  `useIsInsideLivePreview()` is true, adds one document-level, capture-phase
  `click` listener that calls `shouldInterceptLivePreviewNavClick` for the
  clicked anchor and calls `event.preventDefault()` when it says to.
  `next/link`'s own click handler already bails out when
  `event.defaultPrevented` is true (confirmed in the installed `next`
  package), so this cleanly stops the navigation before Next's router runs -
  no `stopPropagation()`, no fighting React's own event handling.
- Mount `<LivePreviewNavGuard />` once in `src/app/(frontend)/layout.tsx`,
  alongside `<SettingsLivePreviewSync />` - the same "renders nothing, mounted
  once in the root layout" pattern already used there, so it covers every
  route without being duplicated per page type.

### Must not break

- A real site visitor (Live Preview never activates) keeps normal link
  navigation - `useIsInsideLivePreview` requires a genuine postMessage from
  the exact configured server origin, the same anti-heuristic guarantee
  `useIsLivePreviewActive` already relies on.
- `target="_blank"` links (the social icons, and any nav link with "Open in
  new tab" checked) are unaffected - they never navigate the iframe itself.
- A modified click (Cmd/Ctrl/Shift/Alt-click) - e.g. opening a link in a new
  tab - is left alone.
- A same-page hash link is left alone (not a navigation away from the
  document being edited).
- Editing (`useEditableField`, `useIsEditableField`) and the admin-side
  accordion/highlight sync from the prior fixes are untouched - this only
  intercepts anchor clicks.

## Build steps

- [x] Add `useIsInsideLivePreview`, `shouldInterceptLivePreviewNavClick`, and
      `LivePreviewNavGuard`, and mount the guard once in
      `src/app/(frontend)/layout.tsx`.
      **Done when:** with the home page open in Live Preview, clicking the
      "Blog" nav link (or any other internal link on the page, including one
      inside a block) does not navigate the iframe and does not change
      inline-editability - verified in a real browser, before and after the
      click, the same way the bug itself was reproduced. A real (non-preview)
      visit to the site still navigates normally on every link. A
      `target="_blank"` link and a Cmd/Ctrl-click still behave normally
      inside Live Preview too.

## Verify

- In Live Preview on the home page: click the Header's "Blog" nav link -
  the iframe stays on the current page, and inline text is still editable
  afterward.
- Same for a Footer nav link, and for a link inside a block's own content
  (e.g. a Hero or CallToAction button) if one points at another page.
- Cmd/Ctrl-click an internal nav link in Live Preview: still opens normally
  (in a new tab, outside this project's control) rather than being silently
  swallowed.
- A social link (`target="_blank"`) still opens in a new tab from Live
  Preview.
- Outside Live Preview (visit the deployed/dev site directly, not through
  the admin iframe): every link still navigates normally.

## Verification record

Driven against the running dev server with Playwright/Chrome (multiple
isolated browser contexts, including one with no relationship to the admin
session at all):

| Check | Result |
| --- | --- |
| Plain click on Header nav link, inside Live Preview | Blocked - URL unchanged, `editableCount` stays 12 |
| Plain click on a block-level button link (Hero/CTA) | Blocked, `defaultPrevented: true` |
| Cmd-click / Ctrl-click on a nav link, inside Live Preview | Not intercepted (`defaultPrevented: false`) |
| Click on a `target="_blank"` social link, inside Live Preview | Not intercepted |
| Plain click, completely outside Live Preview (fresh isolated browser, no admin relationship) | Navigates normally - real `GET /blog?_rsc=...` request, final URL `/blog` |
| Prior accordion-expand and field-focus-highlight fixes | All checks re-verified passing after this change |

The false-positive bug (nav guard firing on every plain page view before the
`collectionSlug`/`globalSlug` check was added) was caught by exactly this
"completely outside Live Preview" check - the very first version of this fix
blocked normal navigation on a page that had never been anywhere near
Payload's admin.

Automated gates: `npm run lint` (0 errors, 4 pre-existing warnings),
`npm run test:int` (10 files, 74 tests passing, including 14 new tests across
`tests/int/shouldInterceptLivePreviewNavClick.int.spec.ts` and
`tests/int/useIsInsideLivePreview.int.spec.ts`), `npm run build` (compiled
successfully).
