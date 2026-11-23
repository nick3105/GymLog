import type { Template } from './types'

export type WorkoutSeries = { id: string; name: string; workouts: Template[] }
export type ScheduledWorkout = {
  id: string
  week: string
  day: string | null
  seriesName: string | null
  assignmentId: string
  position: number
  workout: Template
}
export type ScheduleState = {
  revision: number
  week?: string
  series: WorkoutSeries[]
  entries: ScheduledWorkout[]
}

// Date-only arithmetic uses UTC so daylight saving changes cannot shift the calendar day.
export function shiftScheduleDay(day: string, amount: number): string {
  const value = new Date(day + 'T12:00:00Z')
  value.setUTCDate(value.getUTCDate() + amount)
  return value.toISOString().slice(0, 10)
}

export function scheduleMonday(day: string): string {
  const weekday = new Date(day + 'T12:00:00Z').getUTCDay()
  return shiftScheduleDay(day, -((weekday + 6) % 7))
}

export function entriesForDay(entries: ScheduledWorkout[], day: string | null) {
  return entries.filter((entry) => entry.day === day)
}

export const scheduleActionBar =
  'bg-ink/95 sticky bottom-[calc(4.75rem+env(safe-area-inset-bottom))] mt-4 py-2 backdrop-blur md:bottom-4'
