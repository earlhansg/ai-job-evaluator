/**
 * The toast stack as pure list operations. `ToastProvider` owns the state and the
 * timers; this file owns the rules (PRD §7.6: 4s each, at most three visible).
 */

export const TOAST_LIMIT = 3
export const TOAST_DURATION_MS = 4000

export interface ToastItem {
  id: string
  message: string
}

/** Appends `item`, keeping only the newest `limit`. */
export function pushToast(
  list: readonly ToastItem[],
  item: ToastItem,
  limit = TOAST_LIMIT,
): ToastItem[] {
  return [...list, item].slice(-limit)
}

export function removeToast(list: readonly ToastItem[], id: string): ToastItem[] {
  return list.filter((toast) => toast.id !== id)
}
