import { clsx, type ClassValue } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

/**
 * `tailwind-merge` must be told about the custom type ramp (`app/globals.css` @theme).
 * Unconfigured, it cannot tell `text-eyebrow` (a font size) from `text-accent` (a
 * colour), treats them as conflicting, and silently drops the size — so every
 * `cn('text-eyebrow text-muted …')` rendered at the inherited 16px.
 */
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ['eyebrow', 'caption', 'body', 'title', 'display', 'metric'],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
