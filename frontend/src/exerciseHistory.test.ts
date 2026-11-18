import { describe, expect, it } from 'vitest'

import { exerciseHistory } from './exerciseHistory'
import type { Session } from './types'

function session(day: string, completedAt: string, names: string[]): Session {
  return {
    id: completedAt,
    templateId: 'plan',
    name: 'Training',
    day,
    completedAt,
    exercises: names.map((name) => ({
      id: name.toLowerCase(),
      name,
      sets: [{ weight: 0, reps: 10, rpe: null }],
      estimated1rm: null,
    })),
  }
}

describe('exercise progress history', () => {
  it('deduplicates by ID using the latest performed name and sorts by day then completion', () => {
    const old = session('2026-11-10', '2026-11-16T20:00:00Z', ['Bench', 'Row'])
    const newer = session('2026-11-16', '2026-11-16T10:00:00Z', ['Bench'])
    newer.exercises[0].name = 'Paused bench'
    const latest = session('2026-11-16', '2026-11-16T11:00:00Z', ['Squat'])
    expect(exerciseHistory([newer, old, latest]).map((item) => item.name)).toEqual([
      'Squat',
      'Paused bench',
      'Row',
    ])
    expect(exerciseHistory([old, newer])[0].day).toBe('2026-11-16')
  })

  it('excludes skipped and empty entries but keeps zero-weight sets, holds and personal exercises', () => {
    const training = session('2026-11-16', '2026-11-16T11:00:00Z', [
      'Bodyweight',
      'Skipped',
      'Empty',
      'Plank',
      'Rehab',
    ])
    training.exercises[1].sets = [{ skipped: true }]
    training.exercises[2].sets = []
    training.exercises[3].sets = [{ durationSeconds: 30, rpe: null }]
    training.exercises[3].measurement = 'duration'
    training.exercises[4].source = 'personal'
    expect(exerciseHistory([training]).map((item) => item.name)).toEqual([
      'Bodyweight',
      'Plank',
      'Rehab',
    ])
  })

  it('searches names ignoring case and surrounding whitespace, preserving newest-first order', () => {
    const sessions = [
      session('2026-11-10', '2026-11-10T10:00:00Z', ['Bench press']),
      session('2026-11-16', '2026-11-16T10:00:00Z', ['Paused bench press', 'Row']),
    ]
    expect(exerciseHistory(sessions, '  BENCH ').map((item) => item.name)).toEqual([
      'Paused bench press',
      'Bench press',
    ])
    expect(exerciseHistory(sessions, 'missing')).toEqual([])
    expect(exerciseHistory([])).toEqual([])
  })
})
