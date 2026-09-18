'use client'

import { Blocks } from '@/blocks'
import { getServerSideURL } from '@/utilities/getUrl'
import { useScopedLivePreview } from '@/utilities/useScopedLivePreview'
import { useBlockSyncListener } from '@/utilities/useBlockSyncListener'
import type { Page as PageType } from '@/payload-types'

export function PageClient({ initialData }: { initialData: PageType }) {
  const data = useScopedLivePreview<PageType>({
    target: { type: 'collection', collectionSlug: 'pages' },
    initialData,
    serverURL: getServerSideURL(),
    depth: 2,
  })
  useBlockSyncListener()

  return (
    <div>
      <Blocks blocks={data.blocks} />
    </div>
  )
}
