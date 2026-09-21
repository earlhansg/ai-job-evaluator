import { Badge } from '@/components/ui/Badge'
import type { WorkMode } from '@/lib/schemas'

const WORK_MODE_LABEL = {
  remote: 'Remote',
  hybrid: 'Hybrid',
  onsite: 'Onsite',
} as const satisfies Record<WorkMode, string>

interface WorkModeBadgeProps {
  workMode: WorkMode
  className?: string
}

/**
 * Deliberately `neutral` for all three modes. `match`/`partial`/`mismatch` are reserved
 * for evaluation outcome (`design-system.md` §6) — whether onsite is bad news is the
 * criteria list's verdict to deliver, not the badge's.
 */
export function WorkModeBadge({ workMode, className }: WorkModeBadgeProps) {
  return (
    <Badge tone="neutral" className={className}>
      {WORK_MODE_LABEL[workMode]}
    </Badge>
  )
}
