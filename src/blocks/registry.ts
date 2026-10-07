import type { Block } from 'payload'

import { editAccordionField } from '@/fields/editAccordion'

import { Hero as HeroConfig } from './Hero/config'
import { FeatureGrid as FeatureGridConfig } from './FeatureGrid/config'
import { CallToAction as CallToActionConfig } from './CallToAction/config'
import { RichTextBlock as RichTextBlockConfig } from './RichTextBlock/config'
import { Table as TableConfig } from './Table/config'
import { Accordion as AccordionConfig } from './Accordion/config'
import { Stats as StatsConfig } from './Stats/config'
import { Testimonials as TestimonialsConfig } from './Testimonials/config'
import { LogoCloud as LogoCloudConfig } from './LogoCloud/config'

import { Hero } from './Hero/Component'
import { FeatureGrid } from './FeatureGrid/Component'
import { CallToAction } from './CallToAction/Component'
import { RichTextBlock } from './RichTextBlock/Component'
import { Table } from './Table/Component'
import { Accordion } from './Accordion/Component'
import { Stats } from './Stats/Component'
import { Testimonials } from './Testimonials/Component'
import { LogoCloud } from './LogoCloud/Component'

/**
 * The single place blocks are registered.
 *
 * To add a block:
 *   1. create `src/blocks/<Name>/config.ts` and `src/blocks/<Name>/Component.tsx`
 *   2. add its config to `rawBlockConfigs` and its component to `blockComponents`
 *
 * Nothing else changes. Every entry in `rawBlockConfigs` automatically gets
 * its fields wrapped in the shared "Edit" accordion below (see
 * `editAccordionField`) - a new block needs no extra wiring for that.
 * `payload.config.ts` spreads `blockConfigs` into its top-level `blocks`,
 * `collections/Pages` picks them up via `blockSlugs`, `RenderBlocks`
 * dispatches through `blockComponents`, and the rich-text converters derive
 * from the same map.
 */

const rawBlockConfigs: Block[] = [
  HeroConfig,
  FeatureGridConfig,
  CallToActionConfig,
  RichTextBlockConfig,
  TableConfig,
  AccordionConfig,
  StatsConfig,
  TestimonialsConfig,
  LogoCloudConfig,
]

/** Payload block definitions. Registered globally, referenced by slug. */
export const blockConfigs: Block[] = rawBlockConfigs.map((block) => ({
  ...block,
  fields: editAccordionField(block.fields),
}))

/**
 * Maps a block's `slug` to the component that renders it. Keys MUST match the
 * `slug` of the corresponding entry in `blockConfigs` — `blockSlugs` below is
 * derived from the configs, so a mismatch shows up as a missing-component
 * warning in development rather than a silent blank section.
 *
 * Typed loosely on purpose: TypeScript cannot correlate a `blockType` string
 * with its own props variant across a heterogeneous map, so the narrowing
 * happens once here rather than at every call site.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const blockComponents: Record<string, React.FC<any>> = {
  hero: Hero,
  featureGrid: FeatureGrid,
  callToAction: CallToAction,
  richText: RichTextBlock,
  table: Table,
  accordion: Accordion,
  stats: Stats,
  testimonials: Testimonials,
  logoCloud: LogoCloud,
}

/** Every registered slug — hand to a `blocks` field's `blockReferences`. */
export const blockSlugs = blockConfigs.map((block) => block.slug)
