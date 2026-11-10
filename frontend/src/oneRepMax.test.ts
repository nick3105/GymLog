import { describe, expect, test } from 'vitest'

import { bestOneRepMax, estimatedOneRepMax } from './oneRepMax'

// The same examples as test_estimate_rules in backend/tests/test_api.py.
describe('estimatedOneRepMax', () => {
  test.each([
    [80, 5, 8, 98.7],
    [80, 5, 10, 93.3],
    [80, 9, 7, 106.7],
    [80, 5, null, 93.3],
    [100, 1, null, 100],
    [80, 11, null, null],
    [0, 8, null, null],
  ])('%s kg × %s @ %s → %s', (weight, reps, rpe, expected) => {
    expect(estimatedOneRepMax(weight, reps, rpe)).toBe(expected)
  })
})

describe('bestOneRepMax', () => {
  test('the BRD example: 100 × 3 @ 9 beats 80 × 8', () => {
    const sets = [
      { weight: '100', reps: '3', rpe: '9' },
      { weight: '80', reps: '8', rpe: '' },
    ]
    expect(bestOneRepMax(sets)).toBe(113.3)
  })

  test('unfinished and bodyweight rows give no estimate', () => {
    const sets = [
      { weight: '', reps: '5', rpe: '' },
      { weight: '0', reps: '12', rpe: '' },
    ]
    expect(bestOneRepMax(sets)).toBeNull()
  })
})
