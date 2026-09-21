'use client'

import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface DrawerProps {
  open: boolean
  onClose: () => void
  side: 'start' | 'end'
  /** The dialog's accessible name. */
  label: string
  children: React.ReactNode
  className?: string
}

/**
 * `end-auto` / `start-auto` are not redundant. The UA stylesheet gives `dialog` both
 * `left: 0` and `right: 0`; with `m-0` killing the `margin: auto` that normally centres
 * it, the box is over-constrained and `left` wins — so `end-0` alone pins the right-hand
 * drawer to the *left* edge. Releasing the opposite inset is what fixes it.
 */
const SIDE_STYLES = {
  start: 'start-0 end-auto border-r -translate-x-full starting:open:-translate-x-full',
  end: 'end-0 start-auto border-l translate-x-full starting:open:translate-x-full',
} as const satisfies Record<'start' | 'end', string>

const SIDE_WIDTH = {
  start: 'w-70',
  end: 'w-85',
} as const satisfies Record<'start' | 'end', string>

/**
 * A native `<dialog>` opened with `showModal()`.
 *
 * `showModal()` — not the bare `open` attribute — is what supplies the focus trap, the
 * `Esc` handler and focus restoration to the trigger. Hiding the dialog with CSS
 * instead would break all three, which is why the desktop branch swaps the element out
 * entirely rather than neutralising this one.
 *
 * A modal dialog renders in the top layer, so it escapes the workspace grid and the UA
 * centres it; the positioning below is therefore not optional.
 *
 * `closedby="any"` gives light dismiss, but it is newer than the rest of `<dialog>`
 * (Chromium 134+ / Safari 18.4+ / Firefox 139+) — the click handler is the fallback,
 * and the backdrop's hit area belongs to the dialog element itself, which is why the
 * test is `event.target === dialog`.
 */
export function Drawer({ open, onClose, side, label, children, className }: DrawerProps) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (open && !el.open) el.showModal()
    if (!open && el.open) el.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      aria-label={label}
      closedby="any"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === ref.current) ref.current.close()
      }}
      className={cn(
        'border-border bg-bg fixed inset-y-0 z-50 m-0 h-dvh max-h-dvh max-w-[85vw] p-0 shadow-lg',
        'opacity-0 transition-[opacity,translate,overlay,display] transition-discrete',
        'duration-base ease-out open:translate-x-0 open:opacity-100 starting:open:opacity-0',
        'backdrop:bg-bg/70 backdrop:opacity-0 backdrop:transition-opacity',
        'backdrop:duration-base open:backdrop:opacity-100',
        SIDE_STYLES[side],
        SIDE_WIDTH[side],
        className,
      )}
    >
      <div className="flex h-full min-h-0 flex-col">
        <div className="flex shrink-0 items-center justify-end p-2">
          <button
            type="button"
            autoFocus
            onClick={() => ref.current?.close()}
            aria-label={`Close ${label}`}
            className={cn(
              'border-border inline-flex size-8 items-center justify-center rounded-md border',
              'bg-surface-1 text-muted duration-fast hover:text-accent transition-colors',
            )}
          >
            <X size={20} strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>
        <div className="min-h-0 flex-1">{children}</div>
      </div>
    </dialog>
  )
}
