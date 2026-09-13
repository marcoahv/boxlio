# Current Feature

**Title:** Change "colour" spelling to "color" throughout
**Type:** Fix
**Status:** verified
**Branch:** `fix/colour-to-color-spelling`

### The problem

Prose in this codebase (comments, a design-system README, and several
Payload admin field descriptions) inconsistently uses British spelling
("colour"/"colours"/"recolouring") while every actual code identifier
already uses American "color" (`background-color`, `--color-surface`,
`color-mix()`, etc. - CSS itself has no other spelling). `coding-standards.md`
doesn't mandate British spelling anywhere; this is just inconsistent prose
that should match the code's own spelling. Full inventory
(`grep -rnoiE "\b[a-z]*colour[a-z]*\b" src`, excluding generated
`payload-types.ts` and archived `blueprint/history/`):

- `src/app/(frontend)/styles/README.md` - 4 occurrences (design-doc prose)
- `src/app/(frontend)/styles/base/_alias-tokens.css` - 4 (comments)
- `src/app/(frontend)/styles/base/_base-tokens.css` - 2 (comment)
- `src/app/(frontend)/styles/elements/_link.css` - 4 (comments)
- `src/app/(frontend)/styles/elements/_logo.css` - 3, including
  "recolouring" (comments)
- `src/blocks/Hero/Component.tsx` - 1 ("colours", doc comment)
- `src/fields/appearance.ts` - 4: 2 in doc comments, 2 in **admin-facing
  field `description` strings** editors actually see in the Payload admin
  (Header/Footer/block Appearance controls)
- `src/globals/Header/Component/Logo.tsx` - 1 (doc comment)
- `src/globals/Header/Component/_header.css` - 3, including "recolours"
  (comments)
- `src/globals/Header/config.ts` - 2, in an **admin-facing field
  description** (the "Logo (dark mode)" field)
- `src/globals/Settings/config.ts` - 1, in an **admin-facing field
  description** (the "Site Icon (dark mode)" field)
- `src/payload-types.ts` - generated from the three admin-description files
  above; regenerates automatically once those source strings change, not
  hand-edited

No capitalized "Colour" occurs anywhere (checked separately), so every
replacement is lowercase-to-lowercase.

### The fix

Replace every occurrence, prose-only, exactly preserving surrounding wording:

| Old | New |
| --- | --- |
| `colour` | `color` |
| `colours` | `colors` |
| `recolouring` | `recoloring` |
| `recolours` | `recolors` |

Pure spelling fix: no identifiers, values, CSS properties, class names, or
field names change - only English spelling inside comments, one README, and
three admin `description` strings (which are user-visible copy, not schema
keys, so renaming them has no data or compatibility impact at all, unlike
the field-name rename in the prior scrim/overlay fix).

Must not break: anything, since nothing but prose text changes. `grep -rnoiE
"colour" src` (excluding `payload-types.ts` before it regenerates and
`blueprint/history/`, which stays as originally written - historical
record) should return nothing afterward.

### Build steps

- [x] 1. Apply the four-row replacement table above to all 10 source files
  listed in "The problem" (everywhere except `payload-types.ts`, which
  regenerates on its own once the three admin-description files change).
  - Done when: `grep -rnoiE "\b[a-z]*colour[a-z]*\b" src` returns nothing
    outside `blueprint/history/`; `npm run build` passes; and
    `payload-types.ts`'s three regenerated doc comments read "color scheme"
    instead of "colour scheme".

### Verify

- `grep -rnoiE "\b[a-z]*colour[a-z]*\b" src` - no matches outside
  `blueprint/history/`.
- `npm run build` passes.
- In the admin, the Header global's "Logo (dark mode)" field, the Settings
  global's "Site Icon (dark mode)" field, and any block's Appearance
  "Surface"/"Transparent at top" fields show the same descriptions with
  "color" instead of "colour".
