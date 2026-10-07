import { afterEach, describe, expect, it, vi } from 'vitest'

import { safeRevalidate } from '@/utilities/safeRevalidate'

describe('safeRevalidate', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('runs a non-throwing callback normally and logs nothing', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const run = vi.fn()

    safeRevalidate('test', run)

    expect(run).toHaveBeenCalledOnce()
    expect(warn).not.toHaveBeenCalled()
  })

  it('swallows a throwing callback instead of propagating it', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const run = () => {
      throw new Error('Invariant: static generation store missing')
    }

    expect(() => safeRevalidate('page home', run)).not.toThrow()
  })

  it('logs the label and the error message when the callback throws', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const run = () => {
      throw new Error('Invariant: static generation store missing')
    }

    safeRevalidate('page home', run)

    expect(warn).toHaveBeenCalledWith(
      '[revalidate] skipped (page home):',
      'Invariant: static generation store missing',
    )
  })

  it('logs a non-Error throw as-is', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const run = () => {
      throw 'plain string failure'
    }

    safeRevalidate('global settings', run)

    expect(warn).toHaveBeenCalledWith('[revalidate] skipped (global settings):', 'plain string failure')
  })
})
