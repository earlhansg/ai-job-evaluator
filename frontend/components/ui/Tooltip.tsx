'use client'

import { cloneElement, isValidElement, useId } from 'react'
import { cn } from '@/lib/utils/cn'

interface TooltipProps {
  /** The explanation. Wired to the trigger with `aria-describedby`, not `title`. */
  content: React.ReactNode
  children: React.ReactNode
  /**
   * Make the wrapper itself the trigger. Needed when the child is inert content (a
   * truncated value); omit it when the child is already a button or a link, or the
   * tooltip adds a second tab stop on the same control.
   */
  focusable?: boolean
  side?: 'top' | 'bottom'
  className?: string
}

const SIDE_STYLES = {
  top: 'bottom-full left-0 mb-2',
  bottom: 'top-full left-0 mt-2',
} as const satisfies Record<'top' | 'bottom', string>

/**
 * Hover **and** focus triggered. Focus is the half people forget, and a tooltip that
 * only opens on hover is invisible both to keyboard users and to agent-browser.
 *
 * `aria-describedby` has to land on the element that actually receives focus, not on
 * the wrapper around it — a description on an ancestor is never announced. So the
 * child is cloned with the attribute, except when `focusable` makes the wrapper itself
 * the trigger.
 *
 * The bubble stays in the DOM at `opacity-0` rather than being unmounted, so the
 * reference always resolves.
 */
export function Tooltip({
  content,
  children,
  focusable = false,
  side = 'top',
  className,
}: TooltipProps) {
  const id = useId()

  const trigger =
    !focusable && isValidElement(children)
      ? cloneElement(children as React.ReactElement<{ 'aria-describedby'?: string }>, {
          'aria-describedby': id,
        })
      : children

  return (
    <span
      className={cn('group relative inline-flex', className)}
      aria-describedby={focusable ? id : undefined}
      tabIndex={focusable ? 0 : undefined}
    >
      {trigger}
      <span
        role="tooltip"
        id={id}
        className={cn(
          'border-border pointer-events-none absolute z-50 w-max max-w-64 rounded-xl border',
          'bg-surface-2 text-caption text-text px-3 py-2 shadow-lg',
          'duration-fast opacity-0 transition-opacity ease-out',
          'group-focus-within:opacity-100 group-hover:opacity-100 group-focus:opacity-100',
          SIDE_STYLES[side],
        )}
      >
        {content}
      </span>
    </span>
  )
}
