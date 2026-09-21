import { redirect } from 'next/navigation'
import { Inbox } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'
import { USER_ID } from '@/lib/config'
import { getStore } from '@/lib/store/index'

/**
 * `/` is not a destination — it resolves the most recent session and hands off.
 *
 * The store is read directly rather than over HTTP: this is server-side routing, not
 * panel data, and a self-fetch would need an absolute origin reconstructed from
 * headers to answer a question the store already knows. `activeSessionId` is computed
 * exactly as `GET /api/sessions` computes it — the index arrives sorted `updatedAt`
 * desc, so it is the first entry.
 *
 * `redirect()` works by throwing `NEXT_REDIRECT`, so it is never wrapped in a
 * `try/catch` and never `return`ed. In a Server Component it replaces rather than
 * pushes, which keeps `/` out of the history stack — Back from `/c/<id>` must not
 * bounce through this page.
 */
export const dynamic = 'force-dynamic'

export default async function WorkspaceIndexPage() {
  const sessions = await getStore().listSessions(USER_ID)
  const activeSessionId = sessions[0]?.id ?? null

  if (activeSessionId) redirect(`/c/${activeSessionId}`)

  return (
    <div className="flex h-full items-center justify-center p-4">
      <EmptyState
        icon={Inbox}
        title="No sessions yet"
        description="Once an evaluation exists, this page opens the most recent one."
      />
    </div>
  )
}
