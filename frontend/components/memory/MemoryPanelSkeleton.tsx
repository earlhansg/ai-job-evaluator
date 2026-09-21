import { Skeleton } from '@/components/ui/Skeleton'

/** Stats block plus four fact cards, at the heights the real content occupies. */
export function MemoryPanelSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-28 w-full" />
      <div className="flex flex-col gap-2">
        <Skeleton className="h-6 w-32" />
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-36 w-full" />
        ))}
      </div>
    </div>
  )
}
