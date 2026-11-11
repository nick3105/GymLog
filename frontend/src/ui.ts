// Tailwind classes used on many screens. Everything tappable is at least 44 px tall (h-11/h-12)
// and input text is 16 px (text-base), or iOS zooms in.

export const primaryButton =
  'inline-flex h-12 items-center justify-center gap-2 rounded-full bg-linear-to-tr from-gradient-start to-gradient-end px-5 font-semibold text-white disabled:opacity-40'

export const secondaryButton =
  'gradient-border inline-flex h-12 items-center justify-center gap-2 rounded-full px-5 font-semibold text-text disabled:opacity-40'

export const textButton =
  'inline-flex min-h-11 items-center gap-1 px-1 font-semibold text-accent disabled:opacity-40'

export const input =
  'h-12 w-full min-w-0 rounded-full border border-border bg-ink px-4 text-base text-text placeholder:text-muted/70 focus:border-accent focus:outline-none'

export const label = 'mb-1 block text-sm font-medium tracking-widest text-muted uppercase'

export const card = 'rounded-lg bg-panel p-4'

export const errorText = 'text-sm font-medium text-danger'
