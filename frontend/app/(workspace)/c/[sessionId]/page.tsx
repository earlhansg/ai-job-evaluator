import { ActiveChatPanel } from '@/components/chat/ActiveChatPanel'

/**
 * Panel 2's route. A Server Component that does nothing but unwrap the param — the
 * `'use client'` lives one level down, in `ActiveChatPanel`, so the route itself ships
 * no JavaScript of its own.
 *
 * `params` is a Promise in Next 16; awaiting it is mandatory. The explicit prop type
 * mirrors the route handlers' signature rather than using the generated `PageProps`
 * helper, which does not exist until typegen has run on a fresh clone.
 */
export default async function SessionPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params
  return <ActiveChatPanel sessionId={sessionId} />
}
