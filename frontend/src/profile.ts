// Display helpers for the profile (REV-11) and the workout start time (RUN-11).
import { formatNumber } from './format'

// "48 min" under an hour, "1 h 05 min" from an hour.
export function formatDuration(seconds: number): string {
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes} min`
  return `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, '0')} min`
}

// Kilograms up to 10 tonnes, then tonnes: "1,000 kg", "12.4 t".
export function formatLifted(kg: number): string {
  return kg < 10000 ? `${formatNumber(kg)} kg` : `${formatNumber(kg / 1000)} t`
}

// When a workout starts, in UTC: "2026-11-16T17:02:11.123Z".
export function startTime(now: Date = new Date()): string {
  return now.toISOString()
}
