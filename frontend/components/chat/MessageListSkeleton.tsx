import { Skeleton } from '@/components/ui/Skeleton'

/** Two bubbles and an analysis card, at roughly the heights the real transcript takes. */
export function MessageListSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-20 w-full max-w-[min(72ch,90%)] self-end rounded-2xl" />
      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-20 w-full max-w-[min(72ch,90%)] self-end rounded-2xl" />
      <Skeleton className="h-24 w-full max-w-[min(72ch,90%)] self-start rounded-2xl" />
    </div>
  )
}
