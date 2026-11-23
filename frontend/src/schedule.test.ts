import { describe, expect, it } from 'vitest'

import { entriesForDay, scheduleMonday, shiftScheduleDay, type ScheduledWorkout } from './schedule'

describe('schedule calendar navigation', () => {
  it('keeps Sunday and the preceding Monday in one week over New Year', () => {
    expect(scheduleMonday('2027-01-03')).toBe('2026-12-28')
    expect(shiftScheduleDay('2026-12-28', 7)).toBe('2027-01-04')
  })

  it('handles leap days and daylight-saving weekends as calendar dates', () => {
    expect(shiftScheduleDay('2028-02-28', 1)).toBe('2028-02-29')
    expect(shiftScheduleDay('2026-03-23', 7)).toBe('2026-03-30')
    expect(scheduleMonday('2026-10-25')).toBe('2026-10-19')
  })

  it('keeps undated ordered occurrences separate from dated workouts', () => {
    const entries = [
      { id: 'day-1', day: null, position: 1 },
      { id: 'dated', day: '2026-11-24', position: 1 },
      { id: 'day-2', day: null, position: 2 },
    ] as ScheduledWorkout[]
    expect(entriesForDay(entries, null).map((entry) => entry.id)).toEqual(['day-1', 'day-2'])
    expect(entriesForDay(entries, '2026-11-24').map((entry) => entry.id)).toEqual(['dated'])
  })
})
