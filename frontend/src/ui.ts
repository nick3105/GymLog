// Tailwind classes used on many screens. Everything tappable is at least 44 px tall (h-11/h-12)
// and input text is 16 px (text-base), or iOS zooms in.

export const primaryButton =
  'inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-lime px-5 font-semibold text-ink disabled:opacity-40'

export const secondaryButton =
  'inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-border bg-panel px-5 font-semibold text-text disabled:opacity-40'

export const textButton =
  'inline-flex min-h-11 items-center gap-1 px-1 font-semibold text-lime disabled:opacity-40'

export const input =
  'h-12 w-full min-w-0 rounded-xl border border-border bg-ink px-3 text-base text-text placeholder:text-muted/70 focus:border-lime focus:outline-none'

export const label = 'mb-1 block text-sm font-medium text-muted'

export const card = 'rounded-2xl border border-border bg-panel p-4'

export const errorText = 'text-sm font-medium text-danger'
