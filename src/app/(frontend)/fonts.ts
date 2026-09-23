// https://fonts.google.com/

import { Montserrat, Vollkorn, Doto } from 'next/font/google'

// Each font exposes a CSS variable rather than a class name. The variables are
// applied to <html> in 'layout.tsx' and consumed by the --font-* tokens in
// 'styles/tokens/_typography.css'.
//
// The variable is the only thing that works: next/font self-hosts each family
// under a generated name, so `font-family: 'Montserrat'` would never match and
// would silently fall back to the system sans-serif.
//
// `preload: false` on all three: Settings.headingFont/bodyFont
// (_alias-tokens.css's --font-heading/--font-body) pick which family is
// actually rendered, editor-configurable and read from data at request time -
// next/font can't know that ahead of time, since font loading is a static,
// compile-time macro. Without this, next/font preloads every weight of all
// three families on every page regardless of which (if any) end up used,
// which is what triggered the browser's "preloaded but not used" warning.
// Weight lists are trimmed to what --font-weight-* tokens actually assign
// (regular/medium/semibold/bold - see _base-tokens.css and its consumers);
// bold (700) stays even though no token references it directly, since rich
// text's <strong>/<b> render at the browser's default bold weight.

export const montserrat = Montserrat({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-montserrat',
  display: 'swap',
  preload: false,
})

export const vollkorn = Vollkorn({
  weight: ['400', '700'],
  subsets: ['latin'],
  variable: '--font-vollkorn',
  display: 'swap',
  preload: false,
})

export const doto = Doto({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-doto',
  display: 'swap',
  preload: false,
})

/** Applied together on <html> so every --font-* token resolves. */
export const fontVariables = [montserrat.variable, vollkorn.variable, doto.variable].join(' ')
