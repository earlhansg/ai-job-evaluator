import { cn } from '@/lib/utils/cn'

interface SessionGroupHeaderProps {
  label: string
  className?: string
}

/** Eyebrow-role divider between date groups. Only rendered for non-empty groups. */
export function SessionGroupHeader({ label, className }: SessionGroupHeaderProps) {
  return (
    <h3
      className={cn(
        'text-eyebrow text-muted px-3 pt-2 font-mono tracking-[0.08em] uppercase',
        className,
      )}
    >
      {label}
    </h3>
  )
}
