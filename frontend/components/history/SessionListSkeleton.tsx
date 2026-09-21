import { Skeleton } from '@/components/ui/Skeleton'

/**
 * Five rows at the real `SessionListItem` height (`min-h-18` = 72px) so nothing shifts
 * when the list resolves.
 */
export function SessionListSkeleton() {
  return (
    <div className="flex flex-col gap-1">
      {Array.from({ length: 5 }, (_, i) => (
        <Skeleton key={i} className="h-18 w-full" />
      ))}
    </div>
  )
}
