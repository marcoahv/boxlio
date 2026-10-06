## Fix tab-switch sync landing on SEO instead of Content / Layout

**Type:** Fix
**Status:** verified
**Branch:** `fix/body-field-focus-tab-switch`

### The problem

Clicking into the Post body text in Live Preview posts `block-field-focus` for
the `body` field. The admin-side handler
(`src/custom/block-field-sync/Component.tsx`) is supposed to switch the
sidebar to whichever tab contains `body` and scroll to it. Instead, unless
the Content / Layout tab is already open, it lands on the **SEO** tab.

Posts has two tab levels: an outer row (Information / Content / Layout /
SEO) and, inside Content / Layout, an inner row (Content / Layout) - see
`src/collections/Posts/config.ts:41` (outer) and `:193` (inner). `body` lives
two levels deep, inside the outer Content / Layout tab's inner Content tab.
Pages has only one tab level (`Pages/config.ts:34`), so this can't happen
there.

**Root cause:** `tryNextTab` (`block-field-sync/Component.tsx:138-147`)
tracked one flat `tried` set and, each retry pass, clicked whichever
untried, inactive `.tabs-field__tab-button` came first in **document order**
within `tabScope` (`document.body` for a top-level field like `body` -
`resolveFieldTarget`). The outer tab-button row always renders before the
active outer tab's own content (where an inner tabs field's buttons live), so
any still-untried *outer* sibling was always found before the *inner* buttons
the previous click just revealed.

Trace for `body` starting from, say, the Information tab active:

1. Pass 1: no row/collapsible chain (`body` sits under tabs, not
   collapsibles), so `tryNextTab` runs immediately. First untried, inactive
   button in document order -> **Content / Layout** (outer). Click.
2. Pass 2 (`body` still not found - its inner Content sub-tab isn't
   necessarily the default): the newly-mounted *inner* Content/Layout
   buttons now exist, but the still-untried *outer* **SEO** button sorts
   earlier in document order (outer row renders before the inner row it
   contains). `tryNextTab` clicks **SEO** instead of ever trying the inner
   buttons.
3. Every outer button is now tried; the inner buttons it never got to try
   are abandoned. The loop runs out of budget and stops on SEO.

If Content / Layout is already active when the click happens, its inner tabs
are already mounted before step 1 runs, so the ping-pong never starts -
matching the reported "unless the content tab is open."

### The fix

In `tryNextTab`, prefer a just-revealed **inner** tab button over a
still-untried **outer** sibling, instead of relying on raw document order.

Added a helper, `tabNestingDepth`, that counts how many ancestor
`.tabs-field` elements a button has (confirmed via `@payloadcms/ui`'s
`Tabs/index.js`: the root of every tabs field instance, outer or inner,
carries the `tabs-field` class), then sorted the untried/inactive candidates
by that count descending before picking the first one.
`Array.prototype.sort` is stable, so ties (several untried buttons at the
same nesting level) keep their existing relative order - no behavior change
for a single-level tabs field (Pages, or any block's own Content/Layout
tabs, which are already scoped to that block's own row and never mix with
document-level tabs).

Must not break:

- Single-level tab switching (Pages' Content / Layout, every block's own
  Content/Layout tabs) - depth-sorting a set of same-depth buttons is a
  no-op.
- The rest of `expandTowardField`'s timing/retry logic (`EXPAND_STEP_MS`,
  `EXPAND_TIMEOUT_MS`, `TAB_SWITCH_RESERVE_MS`) - unchanged.

### Build steps

**Step 1 - Sort `tryNextTab`'s candidates by tabs-nesting depth** ✅

In `src/custom/block-field-sync/Component.tsx`, added `tabNestingDepth`
(counts a button's ancestor `.tabs-field` elements) and changed `tryNextTab`
to sort its untried/inactive candidates deepest-first before clicking the
first one, instead of taking the first match in raw document order.

Done when:

- [x] `tryNextTab` sorts candidates deepest-first; code change reviewed,
  `npm run lint` passes on the changed file, `npm run build` compiles
  successfully.
- [ ] Clicking into the Post body in Live Preview while the Information tab
  is active switches the sidebar to Content / Layout, then to its inner
  Content sub-tab, and scrolls to `body` - never landing on SEO. **Not
  confirmed live** - no browser tool was available during implementation.
- [ ] Same click while SEO is active behaves the same way. **Not confirmed
  live.**
- [ ] Same click while Content / Layout (and its inner Content sub-tab) is
  already active still scrolls to `body` with no tab switching (regression
  check). **Not confirmed live.**
- [ ] Switching tabs for a single-level case - a Pages block's own
  Content/Layout tabs (e.g. clicking a Hero heading) - still works unchanged
  (regression check). **Not confirmed live**, though the depth-sort is a
  provable no-op for same-depth candidates (stable sort).

### Verify

In the admin, with Live Preview open side by side:

1. Open a Post, make sure the **Information** tab is active, then click the
   post's body text in the preview. Expect: sidebar switches to **Content /
   Layout**, its inner **Content** tab, and scrolls to the body editor.
2. Repeat starting from the **SEO** tab active.
3. Repeat with **Content / Layout** already active - should scroll directly,
   no tab switch.
4. Open a Page (or any Post block) with a Hero block, expand it, click its
   heading in the preview - sidebar should still land on the block's own
   Content tab correctly (regression check, single-level tabs).

No test runner is configured for UI/integration behavior per
`coding-standards.md`; the fix was verified by code tracing and a successful
build, not a live browser session or a unit test. The four checklist items
above remain open for a human (or a future session with browser access) to
confirm.
