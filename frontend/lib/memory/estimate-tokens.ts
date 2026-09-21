/**
 * MOCK token counting.
 *
 * Deliberately isolated in its own module (PRD-ONE §14 R3) so swapping in a real
 * tokenizer — the Anthropic token-counting endpoint, or `tiktoken` — is a one-file
 * change. Only *counting* is mocked; the compaction boundary logic in
 * `token-budget.ts` is real.
 *
 * Keep this pure and dependency-free.
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}
