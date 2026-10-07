/**
 * Runs a revalidateTag/revalidatePath call safely outside a request context.
 *
 * Both throw "Invariant: static generation store missing" when called
 * outside an active Next.js request (a standalone script, migration, or
 * cron job driving Payload's Local API). These run from afterChange/
 * afterDelete hooks, so an uncaught throw here aborts the whole write's
 * transaction - the actual document change rolls back along with the cache
 * invalidation that was only ever a side effect. See
 * blueprint/history/fixes/revalidate-outside-request-context.md for why.
 */
export function safeRevalidate(label: string, run: () => void): void {
  try {
    run()
  } catch (error) {
    console.warn(
      `[revalidate] skipped (${label}):`,
      error instanceof Error ? error.message : error,
    )
  }
}
