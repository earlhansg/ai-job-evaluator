/**
 * The effect label format is produced server-side by `lib/mock/send-scripted-message.ts`
 * (`label: \`Saved to memory — ${saved.label}\``). The toast shows it verbatim; the
 * badge's accessible name needs only the fact part.
 */
const EFFECT_PREFIX = 'Saved to memory — '

/** `Saved to memory — TypeScript` → `TypeScript`. Unprefixed input passes through. */
export function factLabelFromEffect(label: string): string {
  return label.startsWith(EFFECT_PREFIX) ? label.slice(EFFECT_PREFIX.length) : label
}
