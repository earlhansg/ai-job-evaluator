'use client'

import { useId, useRef, useState } from 'react'
import { CircleAlert, LoaderCircle, SendHorizontal } from 'lucide-react'
import { ApiError } from '@/lib/api/fetcher'
import { COMPOSER_SUGGESTIONS } from '@/lib/composer-suggestions'
import { MESSAGE_MAX_CHARS } from '@/lib/limits'
import { cn } from '@/lib/utils/cn'
import { formatCount } from '@/lib/utils/format'

interface ComposerProps {
  onSend: (content: string) => Promise<void>
  isSending: boolean
  className?: string
}

/**
 * Panel 2's input (PRD §7.2).
 *
 * **Ctrl/⌘+Enter sends; plain Enter inserts a newline.** Job descriptions are
 * multi-line pastes, so Enter-to-send would fire half a posting.
 *
 * The draft is cleared on submit and restored if the send fails, so a failed paste of
 * a long posting is never lost. The textarea is disabled while pending (which drops
 * focus), so focus is handed back once the send settles.
 *
 * Height auto-grows with `field-sizing-content` — no JS measuring, no inline style.
 * Browsers without it fall back to `rows`.
 *
 * Rendered with `key={sessionId}` by `ActiveChatPanel`, so the draft and error reset on
 * a session switch.
 */
export function Composer({ onSend, isSending, className }: ComposerProps) {
  const [draft, setDraft] = useState('')
  const [error, setError] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const hintId = useId()
  const counterId = useId()

  const trimmed = draft.trim()
  const tooLong = draft.length > MESSAGE_MAX_CHARS
  const canSend = trimmed.length > 0 && !tooLong && !isSending

  async function submit() {
    if (!canSend) return
    // Sent as typed, not trimmed. The server only requires length ≥ 1.
    const content = draft
    setDraft('')
    setError(null)
    try {
      await onSend(content)
    } catch (e) {
      setDraft(content)
      setError(sendErrorMessage(e instanceof ApiError ? e.code : 'UNKNOWN'))
    } finally {
      requestAnimationFrame(() => textareaRef.current?.focus())
    }
  }

  return (
    <form
      aria-label="Send a message"
      onSubmit={(event) => {
        event.preventDefault()
        void submit()
      }}
      className={cn('flex flex-col gap-3', className)}
    >
      <div role="group" aria-label="Suggestions" className="flex flex-wrap gap-2">
        {COMPOSER_SUGGESTIONS.map((suggestion) => (
          <button
            key={suggestion.id}
            type="button"
            disabled={isSending}
            onClick={() => {
              setDraft(suggestion.text)
              setError(null)
              textareaRef.current?.focus()
            }}
            className={cn(
              'border-border bg-surface-1 text-caption text-muted rounded-md border px-2 py-1',
              'duration-fast hover:text-accent transition-colors',
              'disabled:cursor-not-allowed disabled:opacity-50',
            )}
          >
            {suggestion.label}
          </button>
        ))}
      </div>

      <textarea
        ref={textareaRef}
        rows={2}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
            event.preventDefault()
            void submit()
          }
        }}
        aria-label="Message"
        aria-describedby={`${hintId} ${counterId}`}
        aria-invalid={tooLong || undefined}
        disabled={isSending}
        data-testid="composer-input"
        placeholder="Paste a job description, or tell me a constraint…"
        className={cn(
          'field-sizing-content max-h-48 min-h-16 w-full resize-none rounded-xl border px-3 py-2',
          'border-border bg-surface-2 text-body text-text placeholder:text-muted',
          'disabled:opacity-50',
        )}
      />

      <div className="flex items-center justify-between gap-3">
        <span id={hintId} className="text-caption text-muted">
          Ctrl + Enter to send
        </span>

        <div className="flex items-center gap-3">
          <span
            id={counterId}
            className={cn(
              'text-caption inline-flex items-center gap-1 font-mono tabular-nums',
              tooLong ? 'text-mismatch' : 'text-muted',
            )}
          >
            {tooLong ? <CircleAlert size={16} strokeWidth={1.75} aria-hidden="true" /> : null}
            {formatCount(draft.length)} / {formatCount(MESSAGE_MAX_CHARS)}
            {tooLong ? ' · too long' : null}
          </span>

          <button
            type="submit"
            disabled={!canSend}
            aria-label="Send message"
            aria-keyshortcuts="Control+Enter Meta+Enter"
            className={cn(
              'bg-accent text-bg inline-flex size-8 items-center justify-center rounded-md',
              'duration-fast hover:bg-accent/90 transition-colors',
              'disabled:cursor-not-allowed disabled:opacity-50',
            )}
          >
            {isSending ? (
              <LoaderCircle
                size={20}
                strokeWidth={1.75}
                aria-hidden="true"
                className="animate-spin"
              />
            ) : (
              <SendHorizontal size={20} strokeWidth={1.75} aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {error ? (
        <p role="alert" className="text-caption text-mismatch relative flex items-center gap-1">
          <CircleAlert size={16} strokeWidth={1.75} aria-hidden="true" />
          {error}
        </p>
      ) : null}
    </form>
  )
}

/** Branches on the stable error code, never on the message. */
function sendErrorMessage(code: string): string {
  if (code === 'INVALID_BODY')
    return 'That message could not be sent — check its length and try again.'
  if (code === 'SESSION_NOT_FOUND') return 'This session no longer exists.'
  return 'Could not send. Your message is back in the box — try again.'
}
