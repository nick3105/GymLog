import type { SetInput } from './oneRepMax'

export const repFields = [
  { key: 'weight', label: 'kg', mode: 'decimal' },
  { key: 'reps', label: 'Reps', mode: 'numeric' },
  { key: 'rpe', label: 'RPE', mode: 'decimal' },
] as const

export const durationFields = [
  { key: 'durationSeconds', label: 'Seconds', mode: 'numeric' },
  { key: 'rpe', label: 'RPE', mode: 'decimal' },
] as const

// Only presence controls the Finish button; the API validates every numeric limit.
export function isSetComplete(set: SetInput): boolean {
  return (
    !set.skipped &&
    (set.durationSeconds !== undefined
      ? set.durationSeconds !== ''
      : set.weight !== '' && set.reps !== '')
  )
}

export function setPayload(set: SetInput) {
  if (set.skipped) return { skipped: true as const }
  const rpe = set.rpe === '' ? null : Number(set.rpe)
  if (set.durationSeconds !== undefined) {
    return { durationSeconds: set.durationSeconds === '' ? null : Number(set.durationSeconds), rpe }
  }
  return {
    weight: set.weight === '' ? null : Number(set.weight),
    reps: set.reps === '' ? null : Number(set.reps),
    rpe,
  }
}
