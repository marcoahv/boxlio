# Current Feature

**Title:** Rename the project to Boxlio
**Type:** Feature (build-plan item 26)
**Status:** verified
**Branch:** `feature/rename-the-project-to-boxlio`

## Goal

Rebrand the template's own identity from "Site Builder"/`payload-builder` to
"Boxlio" (the name chosen for this project, domain `boxlio.dev` already
registered) - the package identifier and every default/fallback site-name
string a freshly cloned, unconfigured instance would show, plus the two
places the project overview documents that default.

## In scope

- `package.json`'s `"name"` field: `"payload-builder"` -> `"boxlio"`.
- Regenerating `package-lock.json` to match (via `npm install`, not a hand
  edit) so the lockfile's own `name` fields stay in sync with `package.json`.
- Every hardcoded `'Site Builder'` fallback string in `src/` (all four
  confirmed by repository search - no others exist):
  - `src/payload.config.ts`'s `SITE_NAME` constant default.
  - `src/globals/Settings/config.ts`'s `siteName` field's `defaultValue`
    (the value a new Settings document starts with before an editor changes
    it).
  - `src/app/(frontend)/layout.tsx`'s `FALLBACK_NAME` constant.
  - `src/utilities/generateMeta.ts`'s inline `settings.siteName || 'Site
    Builder'` fallback.
- `.env.example`'s comment documenting `SITE_NAME`'s default (the variable
  itself stays blank, as today - only the descriptive comment text changes).
- `blueprint/context/project-overview.md`'s title line
  (`# Site Builder - Project Overview` -> `# Boxlio - Project Overview`) and
  its one data-model note describing `siteName`'s default value. This does
  not affect the `blueprint:source-hash` marker - that hash is computed only
  from `project-plan.md` + `build-plan.md`, never from the overview's own
  body, confirmed in `/complete`'s hash contract.

## Out of scope

- **Renaming the external GitHub repository** (`marcoahv/payload-builder`) -
  a separate, explicit action outside this codebase change (it would also
  change the `origin` remote URL); not performed here. Ask separately if you
  want that done.
- **`project-plan.md`** - contains no mention of "Site Builder" or
  "payload-builder" anywhere (confirmed by search), so nothing there is
  stale; not edited. This rename doesn't change product direction, users,
  data, stack, monetization, UI, or deployment, so no plan update is
  required per the standard rule for build-plan additions.
- **Any already-saved `Setting` document's stored `siteName` value** - this
  only changes the *default* a brand-new, never-configured document starts
  with. An existing site that already saved a `siteName` (even if it's
  currently "Site Builder") keeps that stored value untouched; Payload
  `defaultValue`s never retroactively overwrite saved data.
- **DNS, hosting, or deployment configuration for `boxlio.dev`** - domain
  registration is already done outside this workflow; wiring it to a live
  deployment is `/release` territory, not this feature.
- **Any README** - none exists in this repository today; not created as
  part of this rename.

## Build loop

Per `blueprint/config.json` (`workflow.stepReview: "feature"`,
`checkpointCommits: "disabled"`): implement and verify each step below in
order without pausing for approval between them, keeping the project working
after every step, then stop and present one review packet with the complete
diff and each step's Done-when evidence before `/complete`. No checkpoint
commits.

## Build steps

- [x] 1. **Rename the package and its lockfile.** Change `package.json`'s
  `"name"` from `"payload-builder"` to `"boxlio"`. Run `npm install` so
  `package-lock.json`'s own `name` fields regenerate to match (do not hand-edit
  the lockfile). **Done when:** `package.json` shows `"name": "boxlio"`;
  `package-lock.json`'s top-level and root-package `name` fields both read
  `"boxlio"`; `npm run build` still passes (confirms the rename didn't break
  anything dependent on the package name).

- [x] 2. **Replace the four hardcoded `'Site Builder'` fallback strings with
  `'Boxlio'`.** In `src/payload.config.ts` (`SITE_NAME` constant),
  `src/globals/Settings/config.ts` (`siteName` field's `defaultValue`),
  `src/app/(frontend)/layout.tsx` (`FALLBACK_NAME` constant), and
  `src/utilities/generateMeta.ts` (inline fallback) - change each occurrence
  of the literal string `'Site Builder'` to `'Boxlio'`. **Done when:** `grep
  -rn "Site Builder" src` returns no results; `npm run build` and `npm run
  lint` pass with no new error.

- [x] 3. **Update `.env.example`'s documentation comment and the project
  overview.** Change `.env.example`'s comment describing `SITE_NAME`'s
  default from "Site Builder" to "Boxlio" (the blank `SITE_NAME=` value
  itself is unchanged). Change `project-overview.md`'s title line to
  `# Boxlio - Project Overview` and its `siteName` default-value note to say
  "Boxlio" instead of "Site Builder". **Done when:** `grep -rn "Site
  Builder" .env.example blueprint/context/project-overview.md` returns no
  results; the file otherwise reads identically (no other content
  rewritten).

## Files / areas

- `package.json` - edit (`name` field)
- `package-lock.json` - regenerated by `npm install`, not hand-edited
- `src/payload.config.ts` - edit (`SITE_NAME` constant)
- `src/globals/Settings/config.ts` - edit (`siteName` field's `defaultValue`)
- `src/app/(frontend)/layout.tsx` - edit (`FALLBACK_NAME` constant)
- `src/utilities/generateMeta.ts` - edit (inline fallback string)
- `.env.example` - edit (documentation comment only)
- `blueprint/context/project-overview.md` - edit (title line; one data-model
  note)

No `payload-types.ts` changes - no field/schema shape changes, only a
`defaultValue` literal.

## Data / contracts

No schema change. `Setting.siteName`'s `defaultValue` changes from
`'Site Builder'` to `'Boxlio'` - this only affects what a brand-new,
never-saved Settings document is pre-filled with; it has no effect on any
already-persisted document's stored value (Payload defaults are not
retroactive). No new fields, collections, globals, or API surface.

## Testing

No pure logic - four literal-string edits, a package-name change, and two
documentation edits. Unit-test-exempt per `coding-standards.md`'s testing
scope rule, matching this project's precedent for pure-configuration/naming
changes. Verify manually with `npm run dev` via `/try` after implementation:

- A fresh, never-configured Settings document (or the admin's `siteName`
  placeholder/default state) shows "Boxlio", not "Site Builder".
- The public site's `<head>` (page title, Open Graph `site_name`) reads
  "Boxlio" when `siteName` is unset, confirmed via view-source or browser
  devtools.
- `npm run build`, `npm run lint`, and `npm run generate:types` all still
  pass (schema-affecting checks stay green even though nothing here touches
  schema).

## Notes for the AI

- Exactly four hardcoded `'Site Builder'` occurrences exist in `src/`,
  confirmed by `grep -rn "Site Builder" src/` before writing this spec - do
  not go looking for more; if the grep in step 2's Done-when finds a fifth
  during implementation, that's new information to fix, not a sign the spec
  under-counted on purpose.
- `project-plan.md` has zero mentions of the old name - already confirmed,
  don't add one now for the sake of "completeness"; this spec deliberately
  leaves it untouched.
- The `blueprint:source-hash` marker in `project-overview.md` is computed
  only from `project-plan.md` + checkbox-normalized `build-plan.md` bytes
  (per `/overview`'s own hash contract) - editing the overview's title/body
  text in step 3 does not require recomputing or touching that marker.
- Renaming the GitHub repository itself (`marcoahv/payload-builder`) is
  explicitly out of scope - it's an external, separate, hard-to-reverse
  action (changes the `origin` remote too) that needs its own explicit
  request, not something bundled into a code-only rename feature.
