import { expect, test } from 'vitest'

import { bestOneRepMax } from './oneRepMax'
import { formatSet } from './format'

test('a skipped set with retained draft values contributes no live estimate', () => {
  expect(
    bestOneRepMax([
      { weight: '60', reps: '8', rpe: '' },
      { weight: '1000', reps: '1', rpe: '', skipped: true },
    ]),
  ).toBe(76)
  expect(bestOneRepMax([{ weight: '1000', reps: '1', rpe: '', skipped: true }])).toBeNull()
})

test('skipped rows are described without invented weights or reps', () => {
  expect(formatSet({ skipped: true })).toBe('Skipped')
  expect(formatSet({ weight: 0, reps: 8, rpe: null })).toBe('0 × 8')
})
