import { cn } from '@/lib/utils/cn'

type Landmark = 'navigation' | 'main' | 'complementary'

/** Native elements carry these roles implicitly — no `role` attribute needed. */
const LANDMARK_TAG = {
  navigation: 'nav',
  main: 'main',
  complementary: 'aside',
} as const satisfies Record<Landmark, 'nav' | 'main' | 'aside'>

interface PanelShellProps {
  landmark: Landmark
  /** The landmark's accessible name — `Chat history`, `Active chat`, `Long-term memory`. */
  'aria-label': string
  /** Visible eyebrow title in the sticky header. */
  title: string
  /** Optional trailing control in the header row. */
  action?: React.ReactNode
  children: React.ReactNode
  /** Ref to the scrolling region — Panel 2 needs it for scroll anchoring. */
  contentRef?: React.Ref<HTMLDivElement>
  className?: string
  contentClassName?: string
}

/**
 * Panel chrome: landmark element, a fixed header row, and one scrolling content region.
 *
 * Composition over configuration — the caller passes `children` and an `action` node.
 * No `showStats` / `groups` / `collapsible` props; that is how a shell turns into soup.
 *
 * `min-h-0` on both the shell and its content child is load-bearing: a flex or grid
 * child defaults to `min-height: auto`, which makes `overflow-y-auto` silently refuse
 * to scroll.
 */
export function PanelShell({
  landmark,
  'aria-label': ariaLabel,
  title,
  action,
  children,
  contentRef,
  className,
  contentClassName,
}: PanelShellProps) {
  const Tag = LANDMARK_TAG[landmark]

  return (
    <Tag
      aria-label={ariaLabel}
      className={cn('bg-bg flex h-full min-h-0 min-w-0 flex-col', className)}
    >
      <div className="border-border flex shrink-0 flex-wrap items-center justify-between gap-2 border-b p-4">
        <h2 className="text-eyebrow text-muted truncate font-mono tracking-[0.08em] uppercase">
          {title}
        </h2>
        {action}
      </div>
      <div
        ref={contentRef}
        className={cn('min-h-0 min-w-0 flex-1 overflow-y-auto p-4', contentClassName)}
      >
        {children}
      </div>
    </Tag>
  )
}
