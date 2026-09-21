import { Brain } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'

/** Panel 3 with nothing learned yet. Not reachable from the seed, but a real state. */
export function MemoryEmptyState() {
  return (
    <EmptyState
      icon={Brain}
      title="Nothing remembered yet"
      description="Preferences and dealbreakers picked up from your evaluations will collect here."
    />
  )
}
