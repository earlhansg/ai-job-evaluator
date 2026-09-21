import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  /** One sentence explaining what will appear here. No illustrations, no paragraphs. */
  description: string
  action?: React.ReactNode
  className?: string
}

/** `design-system.md` §12: centered 24px muted glyph, title line, one caption sentence. */
export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-2 px-4 py-8 text-center',
        className,
      )}
    >
      <Icon size={24} strokeWidth={1.5} className="text-muted" aria-hidden="true" />
      <p className="text-title text-text font-medium">{title}</p>
      <p className="text-caption text-muted max-w-64">{description}</p>
      {action ? <div className="pt-2">{action}</div> : null}
    </div>
  )
}
