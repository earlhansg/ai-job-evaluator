import { cn } from '@/lib/utils/cn'

interface RationaleNoteProps {
  rationale: string
  className?: string
}

/**
 * The assistant's short "why", on a tinted inset (PRD §7.3) — one of the five
 * structural regions that separate the card from a single-text-block bubble.
 */
export function RationaleNote({ rationale, className }: RationaleNoteProps) {
  return (
    <div className={cn('bg-surface-2 flex min-w-0 flex-col gap-2 rounded-xl p-3', className)}>
      <h4 className="text-eyebrow text-muted font-mono tracking-[0.08em] uppercase">Rationale</h4>
      <p className="text-body text-text break-words">{rationale}</p>
    </div>
  )
}
