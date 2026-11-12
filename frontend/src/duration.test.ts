import { describe, expect, it } from 'vitest'

import { formatSet } from './format'
import { bestOneRepMax } from './oneRepMax'
import { isSetComplete, setPayload } from './setInput'

describe('timed sets', () => {
  const hold = { weight: '', reps: '', durationSeconds: '60', rpe: '8.5' }

  it('formats seconds and keeps them out of 1RM estimates', () => {
    expect(formatSet({ durationSeconds: 60, rpe: 8.5 })).toBe('60 s @ 8.5')
    expect(formatSet({ durationSeconds: 45, rpe: null })).toBe('45 s')
    expect(bestOneRepMax([hold])).toBeNull()
  })

  it('requires seconds instead of weight and reps and sends the right fields', () => {
    expect(isSetComplete(hold)).toBe(true)
    expect(isSetComplete({ ...hold, durationSeconds: '' })).toBe(false)
    expect(setPayload(hold)).toEqual({ durationSeconds: 60, rpe: 8.5 })
    expect(setPayload({ ...hold, skipped: true })).toEqual({ skipped: true })
    expect(isSetComplete({ ...hold, skipped: true })).toBe(false)
    expect(setPayload({ ...hold, durationSeconds: '' })).toEqual({
      durationSeconds: null,
      rpe: 8.5,
    })
  })

  it('preserves repetition sets and drafts created before timed sets existed', () => {
    const old = { weight: '60', reps: '8', rpe: '' }
    expect(isSetComplete(old)).toBe(true)
    expect(setPayload(old)).toEqual({ weight: 60, reps: 8, rpe: null })
    expect(formatSet({ weight: 60, reps: 8, rpe: null })).toBe('60 × 8')
  })
})
