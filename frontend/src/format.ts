// Small display helpers shared by every page.
import type { LoggedSet } from './types'

export function formatNumber(value: number): string {
  return value.toLocaleString('en-GB', { maximumFractionDigits: 1 })
}

export function formatDay(day: string): string {
  return new Date(`${day}T12:00:00`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

// Today in the user's own time zone, as the API expects it: "2026-11-09".
export function today(): string {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

export function formatSet(set: LoggedSet): string {
  if (set.skipped) return 'Skipped'
  const effort = set.rpe === null ? '' : ` @ ${formatNumber(set.rpe)}`
  if (set.durationSeconds !== undefined) return `${set.durationSeconds} s${effort}`
  return `${formatNumber(set.weight)} × ${set.reps}${effort}`
}
