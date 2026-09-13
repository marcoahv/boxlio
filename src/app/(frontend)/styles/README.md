# Styling system

Tailwind CSS v4, configured entirely in CSS. There is no `tailwind.config.js` — v4 is CSS-first and would ignore one.

```
styles/
  index.css          entry point — import order is load-bearing
  personalities.md   personality-selection guide for hand-editing base/_base-tokens.css/_alias-tokens.css in a new project
  base/
    _base-tokens.css   raw values — palette, radius, type scale, spacing, layout rhythm, breakpoints
    _alias-tokens.css  derived tokens built FROM _base-tokens.css — semantic roles, shadows, font-family aliases
    _reset.css         global element rules (reset, color-scheme)
  elements/          single-purpose utilities (button, heading, link, prose, ...)
```

`base/` now holds the entire token system (raw and derived) plus the resets
that consume it — there's no separate `tokens/` folder any more.

Everything here is generic and reusable across projects. Presentational CSS
for one specific component (`Card`, `PostPreview`, the `Header`/`Footer`
globals, a block) lives next to that component's `.tsx` instead — see
"Component CSS lives with its component" below. `index.css` is still the one
place that `@import`s all of it, from both locations.

## The portability rule

**Nothing in `styles/` or `components/primitives/` may import from Payload.**

That single constraint is what lets this folder plus `components/primitives/` be copied into a plain Next.js project and work unchanged. Blocks are the adapters that map Payload data onto primitives — that is where the Payload dependency belongs, and it is why blocks live in `src/blocks/` instead.

This is also why component-specific CSS (`Card.tsx`'s styles, the `Header`
global's styles, ...) is filed next to the component rather than under
`styles/`: those components already import Payload types, so their CSS was
never part of the portable set to begin with — colocating it just makes that
explicit instead of mixing it into the one folder that actually is portable.

Verify it before shipping:

```bash
grep -rn "^import\|from '" src/components/primitives/ src/app/\(frontend\)/styles/ | grep -iE "payload|@/blocks"
```

Anything returned is a leak.

## Import order is load-bearing

`index.css` imports `tailwindcss` **first**. Do not move it.

1. It declares the cascade layer order — `@layer theme, base, components, utilities`. Without that first, everything below compiles *unlayered*, and unlayered CSS outranks every layered rule, so the reset would beat every utility.
2. A `@theme` override only wins if processed **after** Tailwind's defaults. `--breakpoint-*: initial` in `_base-tokens.css` silently does nothing when Tailwind is imported last.

## `_base-tokens.css` + `_alias-tokens.css`: the two brand-swappable files

Together, these are what another project edits when it reuses this `styles/`
folder. The split is by whether a value is **raw** or **derived**:

**`_base-tokens.css` — raw values.** Every literal color, radius, type-scale
number, the base spacing unit, and the layout rhythm (section spacing,
header heights) — including values a personality would tune (colors,
typography, radius) and ones that mostly just size this project's own
chrome. Nothing in this file references another custom property. This is
the file you hand-edit first for a new brand.

**`_alias-tokens.css` — derived tokens.** Every value built by referencing
`_base-tokens.css`'s raw values: `var()`, `light-dark()`, `color-mix()`. Semantic
color roles, shadows, and the two font-family aliases that wire next/font's
generated variable names onto `--font-primary`/`--font-secondary`. It
`@import`s after `_base-tokens.css` in `index.css` since it depends on it.

See each file's own header comment and `personalities.md` for a
personality-based starting point when picking new values.

`_base-tokens.css`'s Breakpoints section is the one exception to "raw = brand":
pure device-viewport mechanics that no personality would ever tune, kept
there anyway so every raw literal lives in one place.

### Two token tiers, split across the two files

This is the core of the system.

**Palette — primitive.** Raw color values, and the only place a literal color belongs (`_base-tokens.css`). `--color-primary: #d6c1a1`.

**Semantic — roles.** What components actually use (`_alias-tokens.css`). `--color-surface`, `--color-on-surface`, `--color-action`.

Components reference **only** the semantic tier. Swapping the palette then re-brands the whole site without touching a component. A block that says `bg-primary` is welded to one color; a block that says `bg-surface-muted` follows the brand.

Surfaces and their foregrounds are defined **as pairs** — picking `surface-muted` also determines `on-surface-muted`, so text can never end up unreadable on its own background. Every dark-mode value is its own named palette step too — never an inline literal buried inside a `light-dark()` call — so a role's derivation in `_alias-tokens.css` is always a pure reference back to `_base-tokens.css`. `surface-muted` ("Primary color" in the admin) and `surface-accent` ("Secondary color") are the deliberate exception: they resolve to a single fixed value — the primary/secondary brand color plus dark text — in both color schemes, unlike `default`/`inverse`, which still flip with `light-dark()`.

### Never name a palette token after a CSS property

**A palette token is named for its value's position in a scale — `--color-neutral-900` — never for the property it happens to be used with.**

Tailwind already prefixes utilities with the property, so a property-named token stutters and then lies. A token called `--color-text-dark` generates `text-text-dark`, and nothing stops `bg-text-light` or `border-text-gray` — a name claiming "text" while setting a background or a border. All three compile without complaint.

Numbers also leave room to grow. `gray-dark`/`gray`/`gray-light` has nowhere to put a new mid-tone; a numbered ramp takes a `-400` without renaming anything.

Roles behave differently: the semantic tier *should* say what a token is for. `--color-on-surface` is right precisely because "on" names a relationship, not a property — it covers icons, borders and focus rings just as well as text.

### `@theme static`, not `@theme`

Plain `@theme` tree-shakes tokens nothing references in source. These tokens are a public contract meant to be overridden at runtime, so they must be emitted whether referenced or not. Every `@theme` in `_base-tokens.css` and `_alias-tokens.css` is `static` for this reason.

### Dark mode

`light-dark()` in the semantic tier, driven by `color-scheme: light dark` in `base/_reset.css`. No flash: OS-driven by default. Next's Lightning CSS downlevels it to a `prefers-color-scheme` toggle for older browsers automatically.

Visitors can also override the OS default. `base/_reset.css` adds `html[data-theme='light']`/`html[data-theme='dark']` rules that force `color-scheme` explicitly, outranking the `:root` default by specificity. `layout.tsx` renders a `beforeInteractive` inline script (see `src/utilities/theme.ts`) that reads the stored preference from `localStorage` and sets `data-theme` on `<html>` before hydration, so there's still no flash even with a manual choice in effect. `globals/Header/Component/ThemeToggle.tsx` is the control that writes that preference. The four `@media (prefers-color-scheme: ...)` blocks in `globals/Header/Component/_header.css` (logo swap, transparent-header surface adoption) have `html[data-theme=...]` mirrors for the same reason - anything keyed off the raw media query needs an explicit-override counterpart, since `color-scheme` alone does not affect `@media (prefers-color-scheme)` evaluation.

Set the light value first, dark second: `light-dark(var(--color-neutral-0), var(--color-neutral-950))`. Both arguments are always palette references — never an inline literal, even for a dark-mode-only shade with no light-mode counterpart; give it its own named palette step in `_base-tokens.css` instead.

## Breakpoints

`_base-tokens.css`'s Breakpoints section clears Tailwind's defaults and defines four, **in pixels**:

| Prefix | Min width |
| --- | --- |
| `atSmall:` | 640px |
| `atMedium:` | 768px |
| `atLarge:` | 1024px |
| `atXLarge:` | 1280px |

`md:` and friends no longer exist — using one is a build error, not a silent no-op.

Pixels, not rems, deliberately: `html { font-size: 62.5% }` makes `1rem = 10px`, so Tailwind's rem-based defaults would scale to 62.5% and `md:` would fire at 480px instead of 768px.

## Naming

**`ui-` prefix** on every hand-written `@utility` — `ui-btn`, `ui-heading-1`, `ui-prose`. Keeps them from colliding with a future Tailwind class.

**No prefix** on utilities Tailwind generates from `@theme` tokens — `font-primary`, `bg-surface`, `p-4`. These belong to Tailwind's namespaces and cannot be prefixed without fighting the framework.

Some utilities are **modifiers** that only work alongside a base: `ui-btn ui-btn-cta`, `ui-btn ui-btn-outline`. Alone they restyle nothing.

## Elements vs. sections

The difference is which cascade layer they land in, and it matters.

**Elements** use `@utility` → `@layer utilities`.

**Sections** (and other component-specific CSS — see below) use plain CSS inside `@layer components`:

```css
@layer components {
  .ui-section[data-surface='muted'] {
    background-color: var(--color-surface-muted);
    color: var(--color-on-surface-muted);
  }
}
```

Two reasons sections are not `@utility`:

1. **Utilities must win.** In `@layer components` a section rule is always overridable by a `ui-*` utility. If both were utilities they would sit at equal specificity, where only source order decides — and that order is Tailwind's to choose, not ours.
2. **Runtime-composed classes survive.** Tailwind only emits a utility when its scanner finds the class name written literally in source. Authored CSS in a layer is always emitted.

## Component CSS lives with its component

`Section`/`Container`'s own stylesheet, the `Header`/`Footer` globals, `Card`,
`PostPreview`, `Breadcrumbs`, `Pagination`, `PostNavigation`,
`CategoryFilter`, and each block's CSS (e.g. `Table`) all live next to the
`.tsx` file they style, not under `styles/` — `src/components/_card.css`
beside `Card.tsx`, `src/globals/Header/Component/_header.css` beside
`HeaderClient.tsx`, `src/blocks/Table/_table.css` beside
`blocks/Table/Component.tsx`, and so on. `_section.css` (backing the
`Section`/`Container` primitives) lives in `src/components/primitives/` for
the same reason — it styles those two files specifically, even though
nearly every block ends up using it transitively.

They still all land in `@layer components` exactly as before; only their
file's address changed. `index.css` is the one place that has to know where
every one of them lives — its `@import` list is the map.

## Primitives

`components/primitives/` maps props to the `data-*` attributes that `primitives/_section.css` styles:

```tsx
<Section surface="muted" spacing="loose">
  <Container width="narrow">
    <Stack gap="md">
      <Heading level={2}>…</Heading>
    </Stack>
  </Container>
</Section>
```

`Section` stays full-width so its background runs edge to edge; `Container` supplies the measure and gutters.

`Heading` separates document level from visual size — `<Heading level={3} size={5}>` sits correctly in the outline while looking smaller.

**Class names must be literal strings.** Tailwind's scanner cannot resolve interpolation, so `gap-${size}` compiles to nothing. Use a lookup map, as `Stack` and `Heading` do.

## Adding to the system

**A new element utility** — create `elements/_badge.css` with `@utility ui-badge { … }`, import it in `index.css`. Build from tokens, never literals.

**A new token** — a raw value (a new palette color, radius, type-scale number, layout dimension) goes in the right `@theme static` section of `_base-tokens.css`. A derived value (references another custom property — a new semantic role, a shadow, a font-family alias) goes in `_alias-tokens.css`, and must point at `_base-tokens.css`, never contain its own inline literal.

**A new block** — create `src/blocks/<Name>/{config.ts,Component.tsx}` and add both to `src/blocks/registry.ts`. Nothing else changes: `payload.config.ts`, the Pages and Posts collections, `RenderBlocks`, and the rich-text converters all derive from that one file. Spread `appearanceField()` into the config so the block inherits the standard surface/spacing/width controls, then hand those to `<Section>`.

## Checking your work

`@theme static` means tokens appear even when unused, so a missing token *is* a real problem — unlike under plain `@theme`.

Inspect the compiled output without starting the dev server:

```bash
node --input-type=module -e "
import postcss from 'postcss'; import tw from '@tailwindcss/postcss'; import fs from 'node:fs';
const from='src/app/(frontend)/styles/index.css';
const r=await postcss([tw({optimize:false})]).process(fs.readFileSync(from,'utf8'),{from});
process.stdout.write(r.css);" > /tmp/out.css
```

Useful checks on `/tmp/out.css`:

- Every `@media` uses px — a stray `rem` breakpoint means Tailwind's defaults leaked back in.
- Every `var(--x)` has a matching `--x:` definition. The exceptions are `--font-montserrat`, `--font-vollkorn` and `--font-doto`, which `next/font` supplies on `<html>` at runtime.
- `@layer theme, base, components, utilities;` appears before any bare top-level rule.
